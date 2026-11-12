import {
  KrStockNotAvailableError,
  isKrQuoteWindow,
  isKrStockCode,
  KR_PERIOD_TRADING_DAYS,
  krAfterHoursVisible,
  krFeedState,
  krLimitState,
  krPeriodChange,
  rankKrQuotes,
  krStatusBadges,
  krStockLogoUrl,
  krTickSize,
  KR_INDEX_NAMES,
  KR_INVESTOR_MAX_DAYS,
  KR_ORDERBOOK_CACHE_MS,
  KR_ORDERBOOK_STALE_MS,
  KR_ORDERBOOK_WAIT_MS,
  KR_QUOTE_STALE_MS,
  type Candle,
  type KrAfterHoursQuote,
  type KrInvestorNet,
  type KrOrderbookFact,
  type KrOrderbookLevel,
  type KrSupplementPort,
  type KrSupplementStore,
  type KrFeedState,
  type KrListPeriod,
  type KrListSort,
  type KrMarket,
  type KrMarketCalendarStore,
  type KrSessionView,
  type KrStatusBadge,
  type KrStockStore,
  type StoredKrStockQuote,
  isKrMarketActionActive,
  isKrViEventActive,
  kstAt,
  kstDateOf,
  krMarketActionResumesAt,
  krVisibleLastTrade,
  type KrMarketAction,
  type KrMarketStatusStore,
  type KrViEventFact,
  type KrViKind,
  KR_NEWS_READ_LIMIT,
  kstStartOfDay,
  type KrMoveSourceStore,
  type KrArticleBodyPort,
  type KrArticleBodyView,
  KrArticleBodyUnavailableError,
  type NewsTag,
} from "../domain";
import { logger } from "../../shared/config/logger";
import type { TagNews } from "./TagNews";
import { krMoveEvents, moveCardFlags, type MoveDependencies } from "./moveCard";
import { loadKrSession } from "./SyncKrStock";

/**
 * 국내 주식 읽기(F011 · `SRV-REQ-040`) — **저장값만 읽는다.** KIS 를 동기로 부르지 않아 응답 시간이
 * 외부에 묶이지 않는다(시장표 p95 < 80ms 목표).
 *
 * ~~볼 수 있는 사람은 소유자뿐이다~~ **정정 2026-11-10(`ADR-011` · `SRV-REQ-056`)**: 시세는 읽는 사람(사람 · 게스트 토큰)이면 누구나 —
 * 판정은 라우터의 `marketReaderMiddleware` 한 곳이다. 유스케이스는 누가 읽는지 받지 않는다(시세는 누구에게나 같다).
 */

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
  /** VI 발동 중일 때만(F016 단계 A) — 종류 · 발동 시각은 VI 현황 사건에서, 못 받았으면 `null`(칩은 현재가 상태 칸으로 선다) */
  vi: { kind: KrViKind | null; triggeredAt: string | null; count: number | null } | null;
  /**
   * 마지막 체결 시각 — **값이 멈춘 이유가 있을 때만**(거래정지 · 임시정지 · VI · 시장 조치) 채운다. 평소 `null`.
   * 폴링 종목은 오차 1분 안(누적 거래량이 늘어난 회차 시각)
   */
  lastTradeAt: string | null;
  feed: KrFeedState;
  priceUpdatedAt: string;
  /**
   * 시간외 단일가(FR-27) — 마지막 정규장 마감 뒤에 받은 것만, 정규장이 열리면 `null`. 현재가 · 등락과 섞지 않는다
   */
  afterHours: { price: number; change: number; changeRate: number; volume: string; at: string } | null;
  /** 로고 주소 — `krStockLogoUrl`(종목별 판정한 출처 · 지금 키). 키가 없거나 선명한 로고가 없으면 `null` — 화면이 이니셜 */
  logoUrl: string | null;
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
  holidayName: string | null;
}

const toSessionResponse = (view: KrSessionView, now: Date): KrSessionResponse => ({
  session: view.session,
  now: now.toISOString(),
  lastCloseAt: view.lastCloseAt?.toISOString() ?? null,
  nextOpenAt: view.nextOpenAt?.toISOString() ?? null,
  calendarKnown: view.calendarKnown,
  holidayName: view.holidayName,
});

/** 원 단위 정수 — 반올림은 응답 직전 한 번(`ddd-domain.md` §3) */
const won = (v: number) => Math.round(v);
const wonOrNull = (v: number | null) => (v === null ? null : Math.round(v));

/** 오늘 시장 조치(F016 단계 A · FR-3) — 서킷브레이커 · 사이드카. `active` · `resumesAt` 도 서버가 정한다 */
export interface KrMarketActionView {
  market: KrMarket;
  kind: KrMarketAction["kind"];
  stage: number;
  direction: KrMarketAction["direction"];
  startedAt: string;
  endedAt: string | null;
  resumesAt: string | null;
  source: KrMarketAction["source"];
  active: boolean;
}

/** 시세 응답이 같이 읽는 상태 — 종목별 오늘 마지막 VI 사건 · 오늘 시장 조치 */
export interface KrStatusContext {
  vi: Map<string, KrViEventFact>;
  actions: KrMarketActionView[];
}

const EMPTY_STATUS: KrStatusContext = { vi: new Map(), actions: [] };

const regularOf = (session: KrSessionView) => session.session === "regular" || session.session === "closing_auction";

export const toMarketActionView = (a: KrMarketAction, now: Date, session: KrSessionView): KrMarketActionView => ({
  market: a.market,
  kind: a.kind,
  stage: a.stage,
  direction: a.direction,
  startedAt: a.startedAt.toISOString(),
  endedAt: a.endedAt?.toISOString() ?? null,
  resumesAt: krMarketActionResumesAt(a)?.toISOString() ?? null,
  source: a.source,
  active: isKrMarketActionActive(a, now, regularOf(session)),
});

/**
 * 시장 상태 읽기 — 쿼리 두 번(오늘 VI 사건 종목별 최신 · 오늘 시장 조치). 실패하면 빈 상태로 — 상태 태그는 부가라 시세 본문을
 * 막지 않는다(현재가 상태 칸만으로도 정지 · VI 칩은 선다)
 */
export const loadKrStatusContext = async (
  store: KrMarketStatusStore,
  codes: string[],
  now: Date,
  session: KrSessionView
): Promise<KrStatusContext> => {
  const today = kstDateOf(now);
  try {
    const [vi, actions] = await Promise.all([store.latestViEvents(codes, kstAt(today, 0)), store.marketActions(today)]);
    return { vi, actions: actions.map((a) => toMarketActionView(a, now, session)) };
  } catch (error) {
    logger.warn(`국내 시장 상태 읽기 실패: ${(error as Error).message}`);
    return EMPTY_STATUS;
  }
};

const toQuoteView = (
  q: StoredKrStockQuote,
  now: Date,
  session: KrSessionView,
  logoDevToken: string | undefined,
  status: KrStatusContext,
): KrStockQuoteView => {
  const event = status.vi.get(q.code) ?? null;
  const badges = krStatusBadges(q, event !== null && isKrViEventActive(event, now));
  const marketHalted = status.actions.some((a) => a.active && a.market === q.market);
  return {
    ...toQuoteBase(q, now, session, logoDevToken),
    status: badges,
    vi: badges.includes("vi")
      ? { kind: event?.kind ?? null, triggeredAt: event?.triggeredAt.toISOString() ?? null, count: event?.count ?? null }
      : null,
    lastTradeAt: krVisibleLastTrade(q.lastTradeAt, badges, marketHalted)?.toISOString() ?? null,
  };
};

const toQuoteBase = (
  q: StoredKrStockQuote,
  now: Date,
  session: KrSessionView,
  logoDevToken?: string,
): Omit<KrStockQuoteView, "status" | "vi" | "lastTradeAt"> => ({
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
  isHalted: q.isHalted,
  feed: krFeedState(q, now, session),
  priceUpdatedAt: q.priceUpdatedAt.toISOString(),
  afterHours: toAfterHoursView(krAfterHoursVisible(q.afterHours, session)),
  logoUrl: krStockLogoUrl(q, logoDevToken),
});

const toAfterHoursView = (q: KrAfterHoursQuote | null): KrStockQuoteView["afterHours"] =>
  q && { price: won(q.price), change: won(q.change), changeRate: q.changeRate, volume: q.volume.toString(), at: q.at.toISOString() };

export interface KrStockReadDependencies {
  store: KrStockStore;
  calendar: KrMarketCalendarStore;
  /** KIS 상태(FR-92) — 화면의 "시세 제공 지연 중 · {since}" 근거 */
  provider: () => KrProviderView;
  /** logo.dev 퍼블리셔블 키(`KR_LOGO_DEV_TOKEN`) — 없으면 로고 없음(화면 이니셜) */
  logoDevToken?: string;
  /** 지수 · 투자자 동향(슬라이스 6) */
  supplement: KrSupplementStore;
  /** 요약에 보일 지수 코드(`KIS_SUMMARY_INDICES`, 설정 순서 = 화면 순서) */
  summaryIndices: readonly string[];
  /** VI 사건 · 시장 조치(F016 단계 A) */
  status: KrMarketStatusStore;
  /** 호가는 저장하지 않고 요청 시점에 부른다(슬라이스 6b FR-28) */
  orderbookSource: Pick<KrSupplementPort, "orderbook">;
  /**
   * 지금 받는 종목(보유 ∪ 관심 ∪ 시총 상위 N). 시세 표는 이것만 보인다 — 시세 행은 한 번 받은 종목이 다 남아 있어서,
   * 상위 N 에서 밀려난 종목이 10월 가격으로 멈춘 채 표에 섞였다(2026-11-10 57행 중 7행, `SRV-REQ-053` FR-2). 없으면 행 전부(테스트 · 옛 조립)
   */
  universe?: { execute(): Promise<string[]> };
  /** 시황/공시 제목 · 장중 프로그램 매매(F016 단계 B) */
  moveSources: KrMoveSourceStore;
  /** 표 행 카드 표시 — β · σ 뷰 · 카드 문턱(F016 단계 C). 없으면 표시 없음(테스트 · 옛 조립) */
  move?: Pick<MoveDependencies, "betas" | "policy">;
  /** 기사 본문(`SRV-REQ-054`) — `news` 공개 API ACL. 없으면 본문 경로가 503(테스트 · 옛 조립) */
  articleBody?: KrArticleBodyPort;
  /** 소식 측정 태그(F017 단계 6). 없으면 태그 없음(테스트 · 옛 조립) */
  tagNews?: Pick<TagNews, "execute">;
  now?: () => Date;
}

export abstract class KrStockRead {
  protected readonly now: () => Date;

  constructor(protected readonly deps: KrStockReadDependencies) {
    this.now = deps.now ?? (() => new Date());
  }
}

export class GetKrMarketSession extends KrStockRead {
  async execute(): Promise<KrSessionResponse & { provider: KrProviderView }> {
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
  /** 이 코드들만 — 보유 요약의 이름 · 로고(슬라이스 3b). 없으면 유니버스 전체 */
  codes?: string[];
}

export class ListKrStockQuotes extends KrStockRead {
  async execute(query: KrListQuery) {
    const now = this.now();
    const limit = Math.min(query.limit, KR_LIST_MAX_LIMIT);
    const [session, quotes] = await Promise.all([
      loadKrSession(this.deps.calendar, now),
      (async () => {
        const codes = query.codes ?? (this.deps.universe ? await this.deps.universe.execute() : undefined);
        return this.deps.store.quotes({ codes, limit: KR_LIST_SCAN_LIMIT, offset: 0 });
      })(),
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
    const status = await loadKrStatusContext(this.deps.status, page.map((q) => q.code), now, session);
    const views = page.map((q) => ({ ...toQuoteView(q, now, session, this.deps.logoDevToken, status), periodChange: q.periodChange }));
    // 행 카드 표시(FE-REQ-063 FR-6) — 상세 카드와 같은 판정(크기 · 그날 사건). β 뷰 한 번 읽기
    const flags = this.deps.move
      ? await moveCardFlags(
          this.deps.move.betas,
          this.deps.move.policy,
          page.map((q, i) => ({
            key: q.code,
            changeRate: q.changeRate,
            events: krMoveEvents(views[i]!.status, status.vi.has(q.code), status.actions, q.market),
          })),
          now
        )
      : null;
    return {
      session: toSessionResponse(session, now),
      items: views.map((v) => ({ ...v, moveCard: flags?.get(v.code) ?? false })),
      nextOffset: query.offset + limit < ranked.length ? query.offset + limit : null,
    };
  }
}

export class GetKrStockDetail extends KrStockRead {
  async execute(code: string) {
    if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
    const now = this.now();
    const [session, quote] = await Promise.all([loadKrSession(this.deps.calendar, now), this.deps.store.quote(code)]);
    if (!quote) throw new KrStockNotAvailableError();
    const status = await loadKrStatusContext(this.deps.status, [quote.code], now, session);

    return {
      session: toSessionResponse(session, now),
      quote: toQuoteView(quote, now, session, this.deps.logoDevToken, status),
      /** 이 종목 시장의 오늘 조치 — 상세 머리 띠(FE-REQ-063 FR-2) */
      marketActions: status.actions.filter((a) => a.market === quote.market),
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
  async execute(code: string, period: KrChartPeriod, count: number) {
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
  async execute(q: string) {
    const items = await this.deps.store.search(q.trim(), KR_SEARCH_LIMIT);
    const inUniverse = new Set(
      (await this.deps.store.quotes({ codes: items.map((i) => i.code), limit: KR_SEARCH_LIMIT, offset: 0 })).map((q) => q.code)
    );
    return { items: items.map((item) => ({ ...item, inUniverse: inUniverse.has(item.code) })) };
  }
}

// ==================== 부가 정보 (슬라이스 6 · FR-49 · 50) ====================

export interface KrIndexView {
  code: string;
  name: string;
  /** 포인트 — 소수 둘째 자리(KIS 가 주는 자릿수) */
  value: number;
  change: number;
  changeRate: number;
  advancers: number | null;
  unchanged: number | null;
  decliners: number | null;
  updatedAt: string;
  /** 시세 받는 시간대인데 3분 넘게 안 바뀌었다 — 현재가와 같은 기준(`KR_QUOTE_STALE_MS`) */
  stale: boolean;
}

const points = (v: number) => Math.round(v * 100) / 100;

/**
 * 코스피 · 코스닥 요약(FR-49) — 저장값만. 무엇을 · 어떤 순서로 보일지는 설정(`KIS_SUMMARY_INDICES`)이 정하고,
 * 아직 한 번도 못 받은 지수는 빠진다(빈 칸을 그리지 않는다)
 */
export class GetKrIndices extends KrStockRead {
  async execute() {
    const now = this.now();
    const codes = [...this.deps.summaryIndices];
    const [session, stored] = await Promise.all([loadKrSession(this.deps.calendar, now), this.deps.supplement.indexQuotes(codes)]);
    const byCode = new Map(stored.map((q) => [q.code, q]));
    const live = isKrQuoteWindow(session);
    const items: KrIndexView[] = codes.flatMap((code) => {
      const q = byCode.get(code);
      if (!q) return [];
      return [
        {
          code,
          name: KR_INDEX_NAMES[code] ?? code,
          value: points(q.value),
          change: points(q.change),
          changeRate: q.changeRate,
          advancers: q.advancers,
          unchanged: q.unchanged,
          decliners: q.decliners,
          updatedAt: q.updatedAt.toISOString(),
          stale: live && now.getTime() - q.updatedAt.getTime() > KR_QUOTE_STALE_MS,
        },
      ];
    });
    return { session: toSessionResponse(session, now), items };
  }
}

const toNetView = (n: KrInvestorNet) => ({ quantity: n.quantity.toString(), value: won(n.value) });

/**
 * 종목 투자자 순매수(FR-50) — 저장값만, 최근 `days` 거래일(최신이 앞). 기간 합계는 서버가 낸다(금액은 서버).
 * 마스터에 없는 종목은 404 — 있는데 아직 안 모였으면 빈 `rows`(다음 개장일 저녁 수집이 채운다)
 */
export class GetKrInvestorFlows extends KrStockRead {
  async execute(code: string, days: number) {
    if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
    const listing = await this.deps.store.findListing(code);
    if (!listing) throw new KrStockNotAvailableError();
    const take = Math.min(Math.max(days, 1), KR_INVESTOR_MAX_DAYS);
    const { rows, collectedAt } = await this.deps.supplement.investorFlows(code, take);
    const sum = (pick: (r: (typeof rows)[number]) => KrInvestorNet) => ({
      quantity: rows.reduce((acc, r) => acc + pick(r).quantity, 0n),
      value: rows.reduce((acc, r) => acc + pick(r).value, 0),
    });
    return {
      code,
      days: rows.length,
      collectedAt: collectedAt?.toISOString() ?? null,
      rows: rows.map((r) => ({
        date: r.date,
        individual: toNetView(r.individual),
        foreign: toNetView(r.foreign),
        institution: toNetView(r.institution),
      })),
      // 기간 합계 — 행이 없으면 null(0 을 "순매수 0" 으로 읽게 두지 않는다)
      totals:
        rows.length === 0
          ? null
          : {
              individual: toNetView(sum((r) => r.individual)),
              foreign: toNetView(sum((r) => r.foreign)),
              institution: toNetView(sum((r) => r.institution)),
            },
    };
  }
}

const toLevelView = (l: KrOrderbookLevel) => ({ price: won(l.price), quantity: l.quantity.toString() });

/**
 * 호가 10단계(FR-28) — **저장하지 않는 요청 시점 조회**. 같은 종목은 10초 안이면 받아 둔 값을 준다(`KR_ORDERBOOK_CACHE_MS`),
 * 같은 순간 겹친 요청은 KIS 한 번을 같이 기다린다.
 *
 * 불변식(`SRV-REQ-053` FR-3, 2026-11-10): **받아 둔 값이 있으면 화면은 KIS 를 기다리지 않는다.** 10초가 지났으면 받아 둔 값을 바로 주고
 * 뒤에서 새로 받는다(다음 요청이 새 값을 본다). 처음 보는 종목만 `KR_ORDERBOOK_WAIT_MS` 까지 기다리고, 넘으면 `pending` 빈 호가로
 * 답한다 — 받던 호출은 끝나면 캐시를 채운다. 받아 둔 값이 30초 넘게 낡았거나 마지막 받기가 실패했으면 `stale`.
 * 처음 받기마저 실패하면 `available: false` — 500 으로 상세 화면 전체를 깨지 않는다(부가 정보).
 * 캐시는 프로세스 메모리다(단일 프로세스). 무효화는 시간뿐이다
 */
export class GetKrOrderbook extends KrStockRead {
  private readonly cache = new Map<string, { fact: KrOrderbookFact; fetchedAt: Date }>();
  private readonly inflight = new Map<string, Promise<KrOrderbookFact>>();
  private readonly failedAt = new Map<string, number>();

  async execute(code: string) {
    if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
    const listing = await this.deps.store.findListing(code);
    if (!listing) throw new KrStockNotAvailableError();

    const now = this.now().getTime();
    let cached = this.cache.get(code);
    let pending = false;
    if (!cached || now - cached.fetchedAt.getTime() >= KR_ORDERBOOK_CACHE_MS) {
      const call = this.fetch(code);
      if (cached) {
        void call.catch(() => {}); // 뒤 갱신 — 실패는 failedAt 이 기록한다
      } else {
        const outcome = await Promise.race([
          call.then(() => "done" as const, () => "failed" as const),
          new Promise<"waiting">((resolve) => setTimeout(() => resolve("waiting"), KR_ORDERBOOK_WAIT_MS).unref?.()),
        ]);
        if (outcome === "waiting") pending = true;
        cached = this.cache.get(code);
      }
    }
    if (!cached) {
      return { code, available: false, pending, asks: [], bids: [], totalAskQuantity: null, totalBidQuantity: null, at: null, fetchedAt: null, stale: !pending };
    }
    const { fact, fetchedAt } = cached;
    const lastFailed = this.failedAt.get(code) ?? 0;
    const stale = this.now().getTime() - fetchedAt.getTime() >= KR_ORDERBOOK_STALE_MS || lastFailed > fetchedAt.getTime();
    return {
      code,
      available: true,
      pending: false,
      asks: fact.asks.map(toLevelView),
      bids: fact.bids.map(toLevelView),
      totalAskQuantity: fact.totalAskQuantity.toString(),
      totalBidQuantity: fact.totalBidQuantity.toString(),
      at: fact.at?.toISOString() ?? null,
      fetchedAt: fetchedAt.toISOString(),
      stale,
    };
  }

  /** 겹친 요청은 한 번 · 성공하면 캐시를 채우고 실패하면 시각을 남긴다 — 기다린 요청이 떠나도 결과는 버리지 않는다 */
  private fetch(code: string) {
    const running = this.inflight.get(code);
    if (running) return running;
    const call = this.deps.orderbookSource
      .orderbook(code)
      .then(
        (fact) => {
          this.cache.set(code, { fact, fetchedAt: this.now() });
          return fact;
        },
        (error) => {
          this.failedAt.set(code, this.now().getTime());
          throw error;
        }
      )
      .finally(() => this.inflight.delete(code));
    this.inflight.set(code, call);
    return call;
  }
}

/**
 * 국내 종목 오늘 소식(F016 단계 B · `SRV-REQ-051` FR-1) — 저장값만. 그날(KST 00:00 뒤) 그 종목에 걸린 시황/공시 제목, 최신이 앞 ·
 * 광고성 제외 · 최대 `KR_NEWS_READ_LIMIT`건. 제목 · 제공처 · 시각 · 공시/시황 구분뿐 — 본문 · 링크는 원천에 없다.
 * `collectedAt` 은 시장 전체 마지막 수집 시각(신선도 — 빈 목록이 "소식 없음"인지 "수집 멈춤"인지 가른다)
 */
/** 오늘 소식이 없을 때 거슬러 보는 날 수 */
export const KR_NEWS_RECENT_DAYS = 7;

export class GetKrStockNews extends KrStockRead {
  async execute(code: string) {
    if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
    const listing = await this.deps.store.findListing(code);
    if (!listing) throw new KrStockNotAvailableError();
    const now = this.now();
    const [today, collectedAt] = await Promise.all([
      this.deps.moveSources.newsTitles(code, kstStartOfDay(now), KR_NEWS_READ_LIMIT),
      this.deps.moveSources.newsCollectedAt(),
    ]);
    // 오늘 소식이 없으면 최근 7일 안의 마지막 소식 — 빈 칸 대신 날짜가 붙은 사실(`SRV-REQ-053` FR-2, 11-10 57종목 중 11 빈 칸)
    const recent =
      today.length > 0
        ? null
        : await this.deps.moveSources.newsTitles(code, new Date(now.getTime() - KR_NEWS_RECENT_DAYS * 86_400_000), KR_NEWS_READ_LIMIT);
    const items = recent ?? today;
    const tags = this.deps.tagNews
      ? await this.deps.tagNews.execute(
          "kr",
          items.map((n) => ({
            id: n.serial,
            symbol: code,
            origin: n.kind,
            related: n.related.map((r) => r.code),
            title: n.title,
            publishedAt: n.publishedAt,
          }))
        )
      : new Map<string, NewsTag>();
    return {
      code,
      date: kstDateOf(now),
      /** today = 오늘 소식 · recent = 오늘이 비어 최근 7일 소식 */
      scope: recent ? ("recent" as const) : ("today" as const),
      collectedAt: collectedAt?.toISOString() ?? null,
      items: items.map((n) => ({
        id: n.serial,
        kind: n.kind,
        provider: n.providerName,
        title: n.title,
        publishedAt: n.publishedAt.toISOString(),
        // 뉴스 모달 칩(FE-REQ-065) — 이름 · 등락률(%, 서버 값). 이 종목 자신도 들어 있다(원천 그대로)
        related: n.related,
        /** 측정 태그(F017 단계 6) — 종류를 못 맞히면 null(행만) */
        tag: tags.get(n.serial) ?? null,
      })),
    };
  }
}

/** 시황 일련번호 — 원천 20자리 안팎 숫자. 다른 모양은 검색을 부르지 않는다 */
const KR_NEWS_SERIAL = /^\d{8,24}$/;

/**
 * 국내 시황 기사 본문(`SRV-REQ-054` FR-5) — 그 종목에 걸린 제목만(남의 종목 일련번호 · 광고성 → 404). 공시는 기사가 아니라
 * 포털에 같은 글이 없다 — 검색 없이 `not_found`. 본문 찾기 · 캐시는 `news` 컨텍스트
 */
export class GetKrNewsBody extends KrStockRead {
  async execute(code: string, serial: string): Promise<KrArticleBodyView> {
    if (!isKrStockCode(code) || !KR_NEWS_SERIAL.test(serial)) throw new KrStockNotAvailableError();
    const title = await this.deps.moveSources.newsTitle(serial, code);
    if (!title) throw new KrStockNotAvailableError();
    if (title.kind === "disclosure") {
      return { status: "not_found", paragraphs: [], originalUrl: null, fetchedAt: this.now().toISOString() };
    }
    if (!this.deps.articleBody) throw new KrArticleBodyUnavailableError();
    return this.deps.articleBody.read({ key: `kr:${serial}`, title: title.title, publishedAt: title.publishedAt });
  }
}

/**
 * 국내 종목 장중 수급(F016 단계 B · FR-5) — 오늘 프로그램 매매 누적(체결)의 가장 최근 값. 금액은 원 정수 · 수량은 주(문자열).
 * 오늘 받은 값이 없으면 `program: null`(장 전 · 휴장 · 수집 전 — 0 으로 채우지 않는다). 외국인 · 기관 장중 추정은 원천이 없어
 * (모의 키 거부, 2026-11-06) 응답에 칸을 두지 않는다 — 일별 투자자 동향(`/investors`)이 그 몫이다
 */
export class GetKrIntradayFlows extends KrStockRead {
  async execute(code: string) {
    if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
    const listing = await this.deps.store.findListing(code);
    if (!listing) throw new KrStockNotAvailableError();
    const now = this.now();
    const flow = await this.deps.moveSources.latestProgramFlow(code, kstStartOfDay(now));
    return {
      code,
      date: kstDateOf(now),
      program: flow && {
        at: flow.at.toISOString(),
        netQuantity: flow.netQuantity.toString(),
        netValue: won(flow.netValue),
        buyValue: won(flow.buyValue),
        sellValue: won(flow.sellValue),
        collectedAt: flow.collectedAt.toISOString(),
      },
    };
  }
}
