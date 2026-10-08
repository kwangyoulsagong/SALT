import WebSocket from "ws";

import { logger } from "../../shared/config/logger";
import {
  KR_REALTIME_SLOTS,
  type KrRealtimePort,
  type KrRealtimeState,
  type KrTick,
} from "../domain";
import { assertQueryTr, maskKisSecrets } from "./KisClient";

/**
 * KIS 실시간 체결(`H0STCNT0`) WebSocket — F011 슬라이스 1 · FR-24 · 25 · 93.
 *
 * - 시세 TR 하나만 구독한다. 체결통보(`H0STCNI*`)는 `assertQueryTr` 가 거부한다(계좌 정보)
 * - 연결 · 재연결 · 종료 · 파싱 실패를 각각 처리한다(`workers-external.md`). 재연결은 1→60초 지수 백오프,
 *   연속 3회 실패면 `degraded` — 그동안 슬롯 종목도 1분 폴링이 받는다(폴링은 실시간 값이 신선한 종목만 건너뛴다)
 * - 30초 동안 아무 메시지도 없으면(PINGPONG 포함) 끊고 다시 붙는다
 * - 승인키 · 원문을 로그에 남기지 않는다
 */

export const KR_TICK_TR = "H0STCNT0";
assertQueryTr(KR_TICK_TR);

/** `H0STCNT0` 필드 위치(공식 예제 `ccnl_krx.py` 의 열 순서, 46개) */
const F = {
  code: 0,
  time: 1,
  price: 2,
  change: 4,
  changeRate: 5,
  openPrice: 7,
  highPrice: 8,
  lowPrice: 9,
  tradeVolume: 12,
  accVolume: 13,
  accTradeValue: 14,
  businessDate: 33,
  halted: 35,
} as const;

const IDLE_TIMEOUT_MS = 30_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 60_000;
const DEGRADED_AFTER_FAILURES = 3;
/** 등록 메시지 간격 — 한꺼번에 41건을 밀어 넣지 않는다 */
const SUBSCRIBE_GAP_MS = 60;

/** 가격 칸 — 0 · 숫자 아님은 값 없음 */
const positivePrice = (raw: string | undefined): number | null => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** 데이터 프레임 `0|H0STCNT0|003|a^b^c…` → 체결 목록. 형식이 어긋나면 빈 배열(그 프레임만 버린다) */
export const parseTickFrame = (raw: string): KrTick[] => {
  const [encrypted, trId, countRaw, payload] = raw.split("|");
  if (encrypted !== "0" || trId !== KR_TICK_TR || payload === undefined) return [];
  const count = Number(countRaw);
  const fields = payload.split("^");
  if (!Number.isInteger(count) || count <= 0 || fields.length % count !== 0) return [];
  const width = fields.length / count;
  if (width <= F.halted) return [];

  const ticks: KrTick[] = [];
  for (let i = 0; i < count; i++) {
    const r = fields.slice(i * width, (i + 1) * width);
    const date = r[F.businessDate];
    const time = r[F.time];
    const price = Number(r[F.price]);
    if (!/^\d{8}$/.test(date) || !/^\d{6}$/.test(time) || !Number.isFinite(price) || price <= 0) continue;
    ticks.push({
      code: r[F.code],
      price,
      change: Number(r[F.change]) || 0,
      changeRate: Number(r[F.changeRate]) || 0,
      tradeVolume: Number(r[F.tradeVolume]) || 0,
      accVolume: BigInt(/^\d+$/.test(r[F.accVolume]) ? r[F.accVolume] : "0"),
      accTradeValue: Number(r[F.accTradeValue]) || 0,
      isHalted: r[F.halted] === "Y",
      openPrice: positivePrice(r[F.openPrice]),
      highPrice: positivePrice(r[F.highPrice]),
      lowPrice: positivePrice(r[F.lowPrice]),
      at: new Date(
        `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}+09:00`
      ),
    });
  }
  return ticks;
};

export interface KisRealtimeClientOptions {
  url: string;
  approvalKey: (force: boolean) => Promise<string>;
  secrets: Array<string | undefined>;
  /** 테스트용 주입 — 기본 30초 · 1초 · 5초 · 60ms */
  idleTimeoutMs?: number;
  backoffBaseMs?: number;
  watchdogIntervalMs?: number;
  subscribeGapMs?: number;
}

export class KisRealtimeClient implements KrRealtimePort {
  private ws: WebSocket | null = null;
  private current: KrRealtimeState = "idle";
  private desired: string[] = [];
  private readonly active = new Set<string>();
  private onTick: ((ticks: KrTick[]) => void) | null = null;
  private failures = 0;
  private lastMessageAt = 0;
  private watchdog: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private stopping = false;
  private key: string | null = null;

  constructor(private readonly options: KisRealtimeClientOptions) {}

  state() {
    return this.current;
  }

  subscribed() {
    return [...this.active];
  }

  async connect(onTick: (ticks: KrTick[]) => void) {
    this.onTick = onTick;
    this.stopping = false;
    if (this.ws && (this.current === "open" || this.current === "connecting")) return;
    await this.open(false);
  }

  async subscribe(codes: string[]) {
    this.desired = [...new Set(codes)].slice(0, KR_REALTIME_SLOTS);
    await this.sync();
  }

  async disconnect() {
    this.stopping = true;
    this.clearTimers();
    this.active.clear();
    const ws = this.ws;
    this.ws = null;
    this.current = "idle";
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
  }

  // ==================== 내부 ====================

  private async open(forceKey: boolean) {
    this.current = "connecting";
    try {
      this.key = await this.options.approvalKey(forceKey);
    } catch (error) {
      this.scheduleRetry(`승인키 실패: ${(error as Error).message}`);
      return;
    }

    const ws = new WebSocket(this.options.url, { handshakeTimeout: 10_000 });
    this.ws = ws;

    ws.on("open", () => {
      this.current = "open";
      // 실패 횟수는 여기서 비우지 않는다 — 받아 주고 바로 끊는 연결이면 영원히 degraded 가 안 된다(가짜 서버 테스트가 잡았다).
      // 첫 메시지(등록 응답 · 체결 · PINGPONG)를 받으면 그때 건강한 세션으로 본다
      this.lastMessageAt = Date.now();
      this.active.clear();
      this.startWatchdog();
      logger.info("📡 KIS 실시간 접속");
      void this.sync();
    });

    ws.on("message", (data) => {
      this.lastMessageAt = Date.now();
      this.failures = 0;
      const raw = data.toString();
      if (raw.startsWith("0|") || raw.startsWith("1|")) {
        const ticks = parseTickFrame(raw);
        if (ticks.length > 0) this.onTick?.(ticks);
        return;
      }
      this.onControl(ws, raw);
    });

    ws.on("error", (error) => {
      logger.warn(`KIS 실시간 오류: ${this.mask(error.message)}`);
    });

    ws.on("close", (code) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.active.clear();
      this.clearTimers();
      if (this.stopping) return;
      this.scheduleRetry(`끊김 code=${code}`);
    });
  }

  private onControl(ws: WebSocket, raw: string) {
    let message: any;
    try {
      message = JSON.parse(raw);
    } catch {
      logger.warn("KIS 실시간 — 해석할 수 없는 프레임을 버렸다");
      return;
    }
    const trId = message?.header?.tr_id;
    if (trId === "PINGPONG") {
      ws.send(raw);
      return;
    }
    const code = message?.header?.tr_key;
    const body = message?.body ?? {};
    if (body.rt_cd !== undefined && body.rt_cd !== "0") {
      // 등록 거부(상한 초과 · 승인키 오류 등) — 그 종목은 폴링이 계속 받는다
      if (code) this.active.delete(code);
      logger.warn(`KIS 실시간 등록 거부 — ${code ?? "-"}: ${body.msg_cd ?? ""} ${body.msg1 ?? ""}`);
    }
  }

  /** 원하는 집합과 등록된 집합을 맞춘다 — 빠진 것 해제 · 새것 등록 */
  private async sync() {
    const ws = this.ws;
    if (!ws || this.current !== "open" || !this.key) return;
    const want = new Set(this.desired);
    const remove = [...this.active].filter((c) => !want.has(c));
    const add = this.desired.filter((c) => !this.active.has(c));
    for (const [codes, trType] of [[remove, "2"], [add, "1"]] as const) {
      for (const code of codes) {
        if (this.ws !== ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(
          JSON.stringify({
            header: { approval_key: this.key, custtype: "P", tr_type: trType, "content-type": "utf-8" },
            body: { input: { tr_id: KR_TICK_TR, tr_key: code } },
          })
        );
        if (trType === "1") this.active.add(code);
        else this.active.delete(code);
        await new Promise((resolve) => setTimeout(resolve, this.options.subscribeGapMs ?? SUBSCRIBE_GAP_MS));
      }
    }
  }

  private startWatchdog() {
    this.watchdog = setInterval(() => {
      if (Date.now() - this.lastMessageAt > (this.options.idleTimeoutMs ?? IDLE_TIMEOUT_MS)) {
        logger.warn("KIS 실시간 — 30초 무응답, 다시 접속한다");
        this.ws?.terminate();
      }
    }, this.options.watchdogIntervalMs ?? 5_000);
    this.watchdog.unref();
  }

  private scheduleRetry(reason: string) {
    this.failures++;
    this.current = this.failures >= DEGRADED_AFTER_FAILURES ? "degraded" : "backoff";
    const wait = Math.min((this.options.backoffBaseMs ?? BACKOFF_BASE_MS) * 2 ** (this.failures - 1), BACKOFF_MAX_MS);
    logger.warn(`KIS 실시간 재접속 ${this.failures}회째 — ${wait}ms 후 (${this.mask(reason)})`);
    this.retryTimer = setTimeout(() => {
      // 두 번 넘게 실패하면 승인키를 새로 받는다(FR-25 — 재접속 시 승인키 재발급)
      void this.open(this.failures >= 2);
    }, wait);
    this.retryTimer.unref();
  }

  private clearTimers() {
    if (this.watchdog) clearInterval(this.watchdog);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.watchdog = null;
    this.retryTimer = null;
  }

  private mask(text: string) {
    return maskKisSecrets(text, [...this.options.secrets, this.key ?? undefined]);
  }
}
