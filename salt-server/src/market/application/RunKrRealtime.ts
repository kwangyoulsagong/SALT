import { logger } from "../../shared/config/logger";
import {
  KrMinuteBarBuilder,
  isKrQuoteWindow,
  type KrMarketCalendarStore,
  type KrRealtimePort,
  type KrRealtimeState,
  type KrStockStore,
  type KrTick,
} from "../domain";
import { loadKrSession, type ResolveKrStockUniverse } from "./SyncKrStock";

/** SSE 로 흘리는 체결 — 화면이 쓰는 값만(F011 FR-24) */
export interface KrTickEvent {
  code: string;
  price: number;
  change: number;
  changeRate: number;
  volume: string;
  at: string;
}

export interface KrRealtimeStatus {
  state: KrRealtimeState;
  subscribed: number;
  lastTickAt: string | null;
}

/** DB 반영 주기 — 체결마다 쓰면 초당 수백 번이다. 1초면 화면 반영 < 1s 목표 안이다 */
const FLUSH_MS = 1_000;

/**
 * 국내 주식 실시간(F011 슬라이스 1 · `SRV-REQ-040` FR-24 · 25).
 *
 * 워커가 매분 `reconcile` 을 부른다 — 08:30~18:00 KST 개장일이면 붙어 있고 슬롯(관심 → 시총 순 41)을 맞추고,
 * 그 밖이면 끊는다. 체결은 메모리에 최신 값만 두고 **1초마다 한 번** 배치로 쓴다(현재가 · 5분봉).
 * SSE 구독자에게는 체결마다 바로 흘린다.
 */
export class RunKrRealtime {
  private readonly latest = new Map<string, KrTick>();
  private readonly bars = new KrMinuteBarBuilder();
  private readonly listeners = new Set<(events: KrTickEvent[]) => void>();
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing = false;
  private lastTickAt: Date | null = null;

  constructor(
    private readonly realtime: KrRealtimePort,
    private readonly store: KrStockStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date()
  ) {}

  async reconcile() {
    const session = await loadKrSession(this.calendar, this.now());
    if (!isKrQuoteWindow(session)) {
      if (this.realtime.state() !== "idle") {
        await this.realtime.disconnect();
        await this.flush();
        this.stopFlush();
        logger.info(`📡 KIS 실시간 종료 — ${session.session}`);
      }
      return { connected: false, session: session.session };
    }

    await this.realtime.connect((ticks) => this.onTicks(ticks));
    await this.realtime.subscribe(await this.universe.execute());
    this.startFlush();
    return { connected: true, session: session.session, state: this.realtime.state() };
  }

  status(): KrRealtimeStatus {
    return {
      state: this.realtime.state(),
      subscribed: this.realtime.subscribed().length,
      lastTickAt: this.lastTickAt?.toISOString() ?? null,
    };
  }

  /** SSE 구독. 돌려받은 함수로 해제한다 */
  listen(listener: (events: KrTickEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private onTicks(ticks: KrTick[]) {
    for (const tick of ticks) {
      this.latest.set(tick.code, tick);
      this.bars.add(tick);
    }
    this.lastTickAt = this.now();
    if (this.listeners.size === 0) return;
    const events = ticks.map((t) => ({
      code: t.code,
      price: t.price,
      change: t.change,
      changeRate: t.changeRate,
      volume: t.accVolume.toString(),
      at: t.at.toISOString(),
    }));
    for (const listener of this.listeners) {
      try {
        listener(events);
      } catch (error) {
        logger.warn(`실시간 구독자 실패: ${(error as Error).message}`);
      }
    }
  }

  private startFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_MS);
    this.flushTimer.unref();
  }

  private stopFlush() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
  }

  /** 앞 회차가 안 끝났으면 건너뛴다 — DB 가 느려도 쓰기가 쌓이지 않는다(값은 다음 회차가 최신으로 쓴다) */
  private async flush() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const ticks = [...this.latest.values()];
      this.latest.clear();
      const bars = this.bars.drain(this.now());
      await Promise.all([this.store.applyTicks(ticks, this.now()), this.store.upsertMinuteCandles(bars)]);
    } catch (error) {
      logger.warn(`실시간 저장 실패: ${(error as Error).message}`);
    } finally {
      this.flushing = false;
    }
  }
}
