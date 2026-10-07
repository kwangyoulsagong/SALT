import {
  KrStockNotAvailableError,
  isKrStockCode,
  isKrStockViewer,
  krFeedState,
  krLimitState,
  krStatusBadges,
  krTickSize,
  type Candle,
  type KrFeedState,
  type KrMarket,
  type KrMarketCalendarStore,
  type KrSessionView,
  type KrStatusBadge,
  type KrStockStore,
  type StoredKrStockQuote,
} from "../domain";
import { loadKrSession } from "./SyncKrStock";

/**
 * 국내 주식 읽기(F011 · `SRV-REQ-040`) — **저장값만 읽는다.** KIS 를 동기로 부르지 않아 응답 시간이
 * 외부에 묶이지 않는다(시장표 p95 < 80ms 목표).
 *
 * 볼 수 있는 사람은 소유자뿐이다(`FORECAST_OWNER_EMAILS` 재사용, 재배포 약관 확인 전 — F011 §정책).
 * 비소유자에게는 404 하나로 답해 국내 주식 시세가 있다는 사실도 주지 않는다.
 */

export interface KrStockViewer {
  userId: string;
  email?: string;
}

export interface KrStockQuoteView {
  code: string;
  name: string;
  market: KrMarket;
  price: number;
  change: number;
  changeRate: number;
  volume: string;
  tradeValue: number;
  marketCap: number | null;
  basePrice: number | null;
  upperLimit: number | null;
  lowerLimit: number | null;
  limitState: "upper" | "lower" | null;
  status: KrStatusBadge[];
  isHalted: boolean;
  feed: KrFeedState;
  priceUpdatedAt: string;
}

export interface KrSessionResponse {
  session: KrSessionView["session"];
  now: string;
  lastCloseAt: string | null;
  nextOpenAt: string | null;
  calendarKnown: boolean;
}

const toSessionResponse = (view: KrSessionView, now: Date): KrSessionResponse => ({
  session: view.session,
  now: now.toISOString(),
  lastCloseAt: view.lastCloseAt?.toISOString() ?? null,
  nextOpenAt: view.nextOpenAt?.toISOString() ?? null,
  calendarKnown: view.calendarKnown,
});

/** 원 단위 정수 — 반올림은 응답 직전 한 번(`ddd-domain.md` §3) */
const won = (v: number) => Math.round(v);
const wonOrNull = (v: number | null) => (v === null ? null : Math.round(v));

const toQuoteView = (q: StoredKrStockQuote, now: Date, session: KrSessionView): KrStockQuoteView => ({
  code: q.code,
  name: q.name,
  market: q.market,
  price: won(q.price),
  change: won(q.change),
  changeRate: q.changeRate,
  // 누적 거래량은 2^53 을 넘지 않지만 BigInt 는 JSON 이 못 싣는다 — 문자열로
  volume: q.volume.toString(),
  tradeValue: won(q.tradeValue),
  marketCap: wonOrNull(q.marketCap),
  basePrice: wonOrNull(q.basePrice),
  upperLimit: wonOrNull(q.upperLimit),
  lowerLimit: wonOrNull(q.lowerLimit),
  limitState: krLimitState(q),
  status: krStatusBadges(q),
  isHalted: q.isHalted,
  feed: krFeedState(q, now, session),
  priceUpdatedAt: q.priceUpdatedAt.toISOString(),
});

class KrStockAccess {
  constructor(private readonly viewers: readonly string[]) {}

  assert(viewer: KrStockViewer) {
    if (!isKrStockViewer(viewer.email, this.viewers)) throw new KrStockNotAvailableError();
  }
}

export interface KrStockReadDependencies {
  store: KrStockStore;
  calendar: KrMarketCalendarStore;
  viewerEmails: readonly string[];
  now?: () => Date;
}

abstract class KrStockRead {
  protected readonly access: KrStockAccess;
  protected readonly now: () => Date;

  constructor(protected readonly deps: KrStockReadDependencies) {
    this.access = new KrStockAccess(deps.viewerEmails);
    this.now = deps.now ?? (() => new Date());
  }
}

export class GetKrMarketSession extends KrStockRead {
  async execute(viewer: KrStockViewer): Promise<KrSessionResponse> {
    this.access.assert(viewer);
    const now = this.now();
    return toSessionResponse(await loadKrSession(this.deps.calendar, now), now);
  }
}

/** 페이지 상한 — 유니버스 기본 50, 관심 종목이 더해져도 100 이면 한 화면이다 */
export const KR_LIST_MAX_LIMIT = 100;

export class ListKrStockQuotes extends KrStockRead {
  async execute(viewer: KrStockViewer, query: { limit: number; offset: number }) {
    this.access.assert(viewer);
    const now = this.now();
    const [session, quotes] = await Promise.all([
      loadKrSession(this.deps.calendar, now),
      this.deps.store.quotes({ limit: Math.min(query.limit, KR_LIST_MAX_LIMIT) + 1, offset: query.offset }),
    ]);
    const hasMore = quotes.length > query.limit;
    return {
      session: toSessionResponse(session, now),
      items: quotes.slice(0, query.limit).map((q) => toQuoteView(q, now, session)),
      nextOffset: hasMore ? query.offset + query.limit : null,
    };
  }
}

export class GetKrStockDetail extends KrStockRead {
  async execute(viewer: KrStockViewer, code: string) {
    this.access.assert(viewer);
    if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
    const now = this.now();
    const [session, quote] = await Promise.all([loadKrSession(this.deps.calendar, now), this.deps.store.quote(code)]);
    if (!quote) throw new KrStockNotAvailableError();

    return {
      session: toSessionResponse(session, now),
      quote: toQuoteView(quote, now, session),
      detail: {
        per: quote.per,
        pbr: quote.pbr,
        eps: wonOrNull(quote.eps),
        bps: wonOrNull(quote.bps),
        week52High: wonOrNull(quote.week52High),
        week52Low: wonOrNull(quote.week52Low),
        foreignRate: quote.foreignRate,
        // 호가 단위는 금액 판단이라 서버가 준다(FR-42) — 기준은 현재가
        tickSize: krTickSize(quote.price),
      },
    };
  }
}

export type KrChartPeriod = "1d" | "5m";
export const KR_CHART_MAX_COUNT = 500;

export class GetKrStockChart extends KrStockRead {
  async execute(viewer: KrStockViewer, code: string, period: KrChartPeriod, count: number) {
    this.access.assert(viewer);
    if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
    const candles: Candle[] = await this.deps.store.candles(code, period, Math.min(count, KR_CHART_MAX_COUNT));
    // 5분봉은 슬라이스 1 의 실시간 집계부터 쌓인다 — 몇 거래일치인지를 같이 줘서 화면이 숨기지 않게(FR-46)
    const tradingDays = new Set(candles.map((c) => new Date(c.timestamp.getTime() + 9 * 3_600_000).toISOString().slice(0, 10))).size;
    return {
      period,
      candles: candles.map((c) => ({
        timestamp: c.timestamp.toISOString(),
        open: won(c.open),
        high: won(c.high),
        low: won(c.low),
        close: won(c.close),
        volume: c.volume,
      })),
      coverage: {
        from: candles[0]?.timestamp.toISOString() ?? null,
        to: candles.at(-1)?.timestamp.toISOString() ?? null,
        tradingDays,
      },
    };
  }
}

export const KR_SEARCH_LIMIT = 20;

export class SearchKrStocks extends KrStockRead {
  async execute(viewer: KrStockViewer, q: string) {
    this.access.assert(viewer);
    const items = await this.deps.store.search(q.trim(), KR_SEARCH_LIMIT);
    const inUniverse = new Set(
      (await this.deps.store.quotes({ codes: items.map((i) => i.code), limit: KR_SEARCH_LIMIT, offset: 0 })).map((q) => q.code)
    );
    return { items: items.map((item) => ({ ...item, inUniverse: inUniverse.has(item.code) })) };
  }
}
