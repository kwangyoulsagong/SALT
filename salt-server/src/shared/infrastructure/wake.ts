import { logger } from "../config/logger";

/**
 * 잠 감지 하나(`SRV-REQ-057` FR-6) — 코인 · 국내 · 뉴스가 같이 듣는다.
 *
 * 맥이 자면 타이머가 멈추고 벽시계는 간다. 30초 박동 사이 벽시계가 90초 넘게 뛰면 잠에서 깬 것이다. 잠 자체는 결함이 아니고
 * (사용자 2026-11-10 *"잠잘 땐 수집 안 되는 건 OK, 깨면 밀린 것 전부"*), 깬 뒤 못 메우는 것이 결함이다 — 그래서 깨면 구독자가
 * 밀린 것을 바로 따라잡는다. node-cron 의 놓친 회차(`scheduler.ts` `catchUp`)는 하루 몇 번 작업용이고 5분 · 1시간 작업은
 * 이 경로로 메운다.
 */
export const WAKE_HEARTBEAT_MS = 30_000;
export const WAKE_JUMP_MS = 90_000;

export interface WakeEvent {
  /** 잠든 것으로 보는 마지막 박동 */
  from: Date;
  /** 깬 뒤 첫 박동 */
  to: Date;
  sleptMs: number;
}

type WakeHandler = (event: WakeEvent) => Promise<unknown> | unknown;

/** 박동 판정 — 시계 주입으로 테스트한다. `tick()` 이 깸이면 사건, 아니면 `null` */
export const createWakeDetector = (now: () => number = Date.now, jumpMs = WAKE_JUMP_MS) => {
  let last = now();
  return {
    tick(): WakeEvent | null {
      const t = now();
      const gap = t - last;
      const from = last;
      last = t;
      return gap > jumpMs ? { from: new Date(from), to: new Date(t), sleptMs: gap } : null;
    },
  };
};

/** 자는 동안 KST `hour:minute` 이 한 번이라도 지났나 */
export const crossedKst = (event: WakeEvent, hour: number, minute: number): boolean => {
  const KST = 9 * 3_600_000;
  const DAY = 86_400_000;
  const mark = (hour * 60 + minute) * 60_000;
  const from = event.from.getTime() + KST;
  const to = event.to.getTime() + KST;
  const firstMark = Math.floor(from / DAY) * DAY + mark;
  const next = firstMark > from ? firstMark : firstMark + DAY;
  return next <= to;
};

const hhmm = (at: Date) =>
  at.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });

/** 로그 한 줄 — "수면 HH:MM~HH:MM(n시간)" */
export const describeSleep = (event: WakeEvent): string =>
  `💤→☀️ 수면 ${hhmm(event.from)}~${hhmm(event.to)}(${sleptText(event.sleptMs)}) — 따라잡기 시작`;

/** 한 시간 미만은 분, 그 위는 시간(소수 한 자리) */
const sleptText = (ms: number): string =>
  ms < 3600_000 ? `${Math.round(ms / 60_000)}분` : `${(ms / 3600_000).toFixed(1)}시간`;

const handlers: Array<{ name: string; run: WakeHandler }> = [];
let timer: NodeJS.Timeout | null = null;

/** 구독 — 깨면 등록 순서대로 하나씩(같은 거래소 · KIS 한도를 나눠 쓴다). 하나의 실패가 다음을 막지 않는다 */
export const onWake = (name: string, run: WakeHandler) => {
  handlers.push({ name, run });
};

export const dispatchWake = async (event: WakeEvent) => {
  logger.info(describeSleep(event));
  for (const handler of handlers) {
    try {
      await handler.run(event);
    } catch (error) {
      logger.error(`깸 따라잡기 실패: ${handler.name}`, error);
    }
  }
  logger.info(`☀️ 깸 따라잡기 끝 — 구독 ${handlers.length}`);
};

/** 프로세스에 하나. 두 번 불러도 박동은 하나 */
export const startWakeWatch = () => {
  if (timer) return;
  const detector = createWakeDetector();
  let dispatching = false;
  timer = setInterval(() => {
    const event = detector.tick();
    if (!event || dispatching) return;
    dispatching = true;
    void dispatchWake(event).finally(() => {
      dispatching = false;
    });
  }, WAKE_HEARTBEAT_MS);
  // 박동이 프로세스를 붙잡지 않는다
  timer.unref();
};
