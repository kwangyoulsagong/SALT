import cron, { ScheduledTask } from "node-cron";

import { logger } from "../config/logger";

/**
 * cron 등록 지점.
 *
 * **워커는 스케줄과 락만 담당한다**(`server-architecture.md` §7). 유스케이스는
 * `application` 에 있고 워커는 그것을 부른다. 같은 유스케이스를 HTTP 와 스케줄러가
 * 모두 부를 수 있어야 한다.
 *
 * 겹쳐 도는 것을 막는 **인프로세스 락**이 여기 있다. 단일 프로세스라 이걸로 충분하고,
 * 프로세스가 늘면 그때 분산 락으로 바꾼다 — 바꿀 곳이 이 파일 하나다.
 *
 * ## 놓친 회차(`catchUp`)
 *
 * node-cron v4 는 이벤트 루프가 멈췄다 깨어나면(맥 수면 · 긴 동기 작업) 지나간 회차를 `missed execution` 경고만
 * 남기고 **다시 돌리지 않는다**. 매분 작업은 다음 분이 메우지만 하루 한 번 작업은 그날이 통째로 빠진다 —
 * 2026-10-26 18:41 수면에서 깨며 `kr-investor-flows`(18:40)가 로그 한 줄 없이 사라졌다(F011 슬라이스 6b).
 * `catchUp` 을 켠 작업은 놓친 회차를 깨어난 자리에서 **한 번** 돈다. 여러 회차를 놓쳐도 한 번이다 —
 * 그래서 켜는 작업은 "지금 돌면 밀린 것까지 따라잡는"(멱등 · 이어 받기) 작업이어야 한다.
 */
const running = new Set<string>();

/** 같은 깨어남에 놓친 회차 이벤트가 여러 개 와도 한 번만 돈다 */
const CATCH_UP_COALESCE_MS = 60_000;

const guarded = (name: string, task: () => Promise<void> | void) => async () => {
  if (running.has(name)) {
    logger.warn(`스케줄 중복 실행을 건너뛴다: ${name}`);
    return;
  }
  running.add(name);
  try {
    await task();
  } catch (error) {
    logger.error(`스케줄 실패: ${name}`, error);
  } finally {
    running.delete(name);
  }
};

/** 놓친 회차를 한 번 따라 돈다. 이미 도는 중이면 그 회차가 따라잡는다 */
export const attachCatchUp = (
  task: Pick<ScheduledTask, "on">,
  name: string,
  run: () => Promise<void>,
  now: () => number = Date.now
) => {
  let lastAt = Number.NEGATIVE_INFINITY;
  task.on("execution:missed", () => {
    const t = now();
    if (running.has(name) || t - lastAt < CATCH_UP_COALESCE_MS) return;
    lastAt = t;
    logger.warn(`놓친 회차를 지금 돈다: ${name}`);
    void run();
  });
};

export const schedule = (
  name: string,
  expression: string,
  task: () => Promise<void> | void,
  options: {
    /** 장 시간처럼 벽시계에 묶인 작업은 시간대를 준다(국내 주식 = `Asia/Seoul`). 없으면 프로세스 시간대 */
    timezone?: string;
    /** 놓친 회차를 깨어난 자리에서 한 번 돈다(머리 주석). 하루 몇 번 도는 멱등 작업만 켠다 */
    catchUp?: boolean;
  } = {}
): ScheduledTask => {
  const run = guarded(name, task);
  const scheduled = cron.schedule(expression, run, options.timezone ? { timezone: options.timezone } : undefined);
  if (options.catchUp) attachCatchUp(scheduled, name, run);
  return scheduled;
};
