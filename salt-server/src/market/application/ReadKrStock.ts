import {
  KrStockNotAvailableError,
  isKrStockCode,
  isKrStockViewer,
  KR_PERIOD_TRADING_DAYS,
  krFeedState,
  krLimitState,
  krPeriodChange,
  rankKrQuotes,
  krStatusBadges,
  krStockLogoUrl,
  krTickSize,
  type Candle,
  type KrFeedState,
  type KrListPeriod,
  type KrListSort,
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
  /** 당일 시가 · 고가 · 저가 — 코인 표의 최고가 · 최저가 열(F011 슬라이스 3). 장 전엔 `null` 일 수 있다 */
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  limitState: "upper" | "lower" | null;
  status: KrStatusBadge[];
  isHalted: boolean;
  feed: KrFeedState;
  priceUpdatedAt: string;
  /** 로고 주소 — `krStockLogoUrl`. 없는 로고는 404 라 화면이 이니셜로 넘어간다 */
  logoUrl: string;
}

export interface KrProviderView {
  status: "ok" | "degraded";
  since: string | null;
  lastSuccessAt: string | null;
  realtime: { state: string; subscribed: number; lastTickAt: string | null };
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

const toQuoteView = (
  q: StoredKrStockQuote,
  now: Date,
  session: KrSessionView,
  logoDevToken?: string,
): KrStockQuoteView => ({
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
  openPrice: wonOrNull(q.openPrice),
  highPrice: wonOrNull(q.highPrice),
  lowPrice: wonOrNull(q.lowPrice),
  limitState: krLimitState(q),
  status: krStatusBadges(q),
  isHalted: q.isHalted,
  feed: krFeedState(q, now, session),
  priceUpdatedAt: q.priceUpdatedAt.toISOString(),
  logoUrl: krStockLogoUrl(q.code, q.market, logoDevToken),
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
  /** KIS 상태(FR-92) — 화면의 "시세 제공 지연 중 · {since}" 근거 */
  provider: () => KrProviderView;
  /** logo.dev 퍼블리셔블 키(`KR_LOGO_DEV_TOKEN`) — 없으면 FMP 로고 */
  logoDevToken?: string;
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
  async execute(viewer: KrStockViewer): Promise<KrSessionResponse & { provider: KrProviderView }> {
    this.access.assert(viewer);
    const now = this.now();
    return { ...toSessionResponse(await loadKrSession(this.deps.calendar, now), now), provider: this.deps.provider() };
  }
}

/** 페이지 상한 — 유니버스 기본 50, 관심 종목이 더해져도 100 이면 한 화면이다 */
export const KR_LIST_MAX_LIMIT = 100;
/**
 * 정렬 전에 읽는 행 상한 — 시세 행은 유니버스(시총 상위 N ∪ 관심 ∪ 보유)뿐이라 수백을 넘지 않는다. 정렬 · 기간 변동률을
 * 페이지 전에 매겨야 해서(코인 `rankByPeriodChange` 와 같은 이유) 유니버스 전체를 한 번 읽는다
 */
export const KR_LIST_SCAN_LIMIT = 1_000;

export interface KrListQuery {
  limit: number;
  offset: number;
  sort: KrListSort;
  order: "asc" | "desc";
  period: KrListPeriod;
}

export class ListKrStockQuotes extends KrStockRead {
  async execute(viewer: KrStockViewer, query: KrListQuery) {
    this.access.assert(viewer);
    const now = this.now();
    const limit = Math.min(query.limit, KR_LIST_MAX_LIMIT);
    const [session, quotes] = await Promise.all([
      loadKrSession(this.deps.calendar, now),
      this.deps.store.quotes({ limit: KR_LIST_SCAN_LIMIT, offset: 0 }),
    ]);
    // 실시간이면 기간 변동률 = 전일 대비(코인이 실시간에 `periodChange = change24h` 를 주는 것과 같다)
    const closes =
      query.period === "realtime"
        ? null
        : await this.deps.store.baselineCloses(
            quotes.map((q) => q.code),
            KR_PERIOD_TRADING_DAYS[query.period]
          );
    const withPeriod = quotes.map((q) => ({
      ...q,
      periodChange: closes ? krPeriodChange(q.price, closes.get(q.code)) : q.changeRate,
    }));
    const ranked = rankKrQuotes(withPeriod, query.sort, query.order);
    const page = ranked.slice(query.offset, query.offset + limit);
    return {
      session: toSessionResponse(session, now),
      items: page.map((q) => ({ ...toQuoteView(q, now, session, this.deps.logoDevToken), periodChange: q.periodChange })),
      nextOffset: query.offset + limit < ranked.length ? query.offset + limit : null,
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
      quote: toQuoteView(quote, now, session, this.deps.logoDevToken),
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
