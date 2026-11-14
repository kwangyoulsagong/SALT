import { KrStockDisabledError, KrStockNotAvailableError, UnknownMarketSymbolError, isKrStockCode, krStockLogoUrl } from "../../domain";
import type { KrCompanyHomepageSource, KrHeldCodesSource, KrLogoImageProbe } from "../../domain";
import type { KrArticleBodyPort, MarketScheduleReader, NewsTagReader, PriceFillMarkStore, UniverseSnapshotStore } from "../../domain";
import { GetKrMarketSchedule } from "../GetKrMarketSchedule";
import type {
  KrProviderHealthPort,
  KrRealtimePort,
  KrMarketCalendarStore,
  KrStockMasterSource,
  KrStockQuotePort,
  KrSupplementPort,
  KrSupplementStore,
  KrMarketStatusPort,
  KrMarketStatusStore,
  KrMoveSourcePort,
  KrMoveSourceStore,
  KrStockStore,
  KrSummaryPolicy,
} from "../../domain";
import type {
  AssetQuote,
  ClosePercentiles,
  ClosePoint,
  DailyReturnProfile,
  ExchangeQuotePort,
  HoldingProbe,
  OvernightGapStats,
  TradeHistoryPort,
  FearGreedPort,
  MarketSummaryPolicy,
  IndicatorRepository,
  MarketAssetRepository,
  PriceHistoryRepository,
  PriceTimeframe,
  SentimentForwardReturn,
  SentimentForwardReturnQuery,
  SentimentRepository,
  StoredIndicator,
  StoredSentiment,
  StoredWhaleTransaction,
  SymbolNewsPort,
  WatchlistRepository,
  WhaleTransactionRepository,
} from "../../domain";
import {
  CalculateSentiment,
  GetSentimentHistory,
  ListWhaleTransactions,
  TrackSmartMoney,
  GetMarketDashboard,
  CollectWhaleTrades,
} from "../AnalyzeMarketIntelligence";
import { GetSymbolNews } from "../GetSymbolNews";
import { TagNews } from "../TagNews";
import { SearchAssets } from "../SearchAssets";
import { ReadRisingSectors, ReadSearchRelated, SearchResultGroups } from "../SearchExtras";
import { ResolveKrStockLogos } from "../ResolveKrStockLogos";
import {
  AddToWatchlist,
  ListWatchlist,
  ListWatchlistSymbols,
  RemoveFromWatchlist,
  UpdateWatchlistPrices,
} from "../ManageWatchlist";
import {
  GetChartData,
  GetMarketOverview,
  GetRealTimePrice,
  ListMarketSymbols,
} from "../ReadMarketData";
import { GetMarketSummary } from "../GetMarketSummary";
import { CaptureUniverseSnapshot } from "../CaptureUniverseSnapshot";
import {
  BackfillDailyHistory,
  CatchUpPriceHistory,
  CollectPriceHistory,
  SyncMarketListings,
  UpdateAllMarketPrices,
} from "../SyncMarketData";
import { RefreshTechnicalIndicators } from "../RefreshTechnicalIndicators";
import {
  GetKrMarketSession,
  GetKrIntradayFlows,
  GetKrStockChart,
  GetKrStockDetail,
  GetKrStockNews,
  GetKrNewsBody,
  ListKrStockQuotes,
  SearchKrStocks,
  GetKrIndices,
  GetKrInvestorFlows,
  GetKrOrderbook,
} from "../ReadKrStock";
import { GetCryptoWhyMoved, GetKrWhyMoved } from "../GetWhyMoved";
import type { MoveDependencies } from "../moveCard";
import { RunKrRealtime } from "../RunKrRealtime";
import {
  PollKrStockQuotes,
  ReportKrProviderMetrics,
  SyncKrMinuteBars,
  SyncKrSlotlessMinuteBars,
  BackfillKrUniverseJoiners,
  ResolveKrStockUniverse,
  SyncKrDailyCandles,
  SyncKrFullDailyCandles,
  SyncKrMarketCalendar,
  SyncKrStockMaster,
} from "../SyncKrStock";
import { PollKrAfterHours, PollKrIndices, PruneKrIndexTicks, SyncKrInvestorFlows } from "../SyncKrSupplement";
import { InferKrMarketActions, PollKrViEvents } from "../SyncKrMarketStatus";
import {
  BackfillKrIndexDaily,
  BackfillKrNewsTitles,
  PollKrNewsTitles,
  PollKrProgramFlows,
  PollKrSectorIndices,
  PruneKrMoveSources,
} from "../SyncKrMoveSources";
import { GetKrMarketSummary } from "../GetKrMarketSummary";

/**
 * `market` 의 **공개 API** — 컨텍스트 밖으로 열리는 유일한 지점 (FR-4).
 *
 * ## 여기 있는 넷이 FR-32a 가 요구한 것이다
 *
 * `coach` 의 `market-regime` 이 기술 지표와 심리를, `ai-coach` 계열이 고래 거래를,
 * `portfolio` 의 성과 차트가 종가를 읽는다. 원문에서는 넷 다 **각자 `prisma` 를
 * 직접 뒤졌고**, 그래서 "최신 지표"의 정의가 파일마다 있었다.
 *
 * 조회 전용이다. 시세 갱신·수집처럼 **상태를 바꾸는 것은 열지 않는다** — 밖에서
 * 부를 일이 없고, 열면 다른 컨텍스트가 우리 워커를 대신 돌리게 된다.
 */
export interface MarketApi {
  /** 국내 시황 제목 — AI 경로 본문 찾기(`SRV-REQ-058`)의 입력. 국내가 꺼져 있으면 빈 목록 */
  krNewsTitlesForAiBody(since: Date, limit: number): Promise<Array<{ serial: string; providerName: string; title: string; publishedAt: Date }>>;
  /** 최신 기술 지표. 없으면 `null` — 신규 상장이나 캔들 부족이 정상 경로다. */
  latestIndicator(symbol: string): Promise<StoredIndicator | null>;
  /** 최신 시장 심리. 없으면 `null`. */
  latestSentiment(symbol: string): Promise<StoredSentiment | null>;
  recentWhaleTransactions(
    symbol: string,
    limit?: number
  ): Promise<StoredWhaleTransaction[]>;
  /** 여러 심볼의 종가를 한 번에. 심볼당 조회를 부르지 않게 하는 자리다. */
  closesSince(symbols: string[], since: Date): Promise<ClosePoint[]>;

  /**
   * ## 아래 여섯은 `coach` 통합(FR-32)이 요구한 것이다
   *
   * 전부 **여러 심볼을 한 번에** 받는다. 원문의 코치는 심볼마다 조회를 돌리거나
   * (`N+1`) 우리 테이블을 밖에서 직접 뒤졌다 — `technicalIndicator` 의 `distinct`
   * 조회와 `marketAsset.currentPrice` 가 `ai-coach-feature.extractor` 안에 있었다.
   */
  latestIndicators(
    symbols: string[],
    timeframe?: string
  ): Promise<StoredIndicator[]>;
  latestSentiments(symbols: string[]): Promise<StoredSentiment[]>;
  /**
   * 저장된 시세와 **그 값의 나이**. 신선도 판정은 부르는 쪽이 한다.
   * 국내 주식 코드는 `kr_stock_quotes` 에서 같은 모양으로 온다(F011 슬라이스 4 — 코치 판단 재료). 꺼져 있으면 빠진다
   */
  assetQuotes(symbols: string[]): Promise<AssetQuote[]>;
  /** `limit` 은 심볼별이 아니라 전체다 (원문의 `take: 100`). */
  recentWhalesForSymbols(
    symbols: string[],
    limit?: number
  ): Promise<StoredWhaleTransaction[]>;
  /** `since` 이후 5분봉 최고 종가. 추격 매수 판정의 기준선이다. */
  highestCloseSince(
    symbols: string[],
    since: Date
  ): Promise<Array<{ symbol: string; close: number }>>;
  /** `at` 이후 첫 종가 — 주기 필수. 성적표 · 월초 평가의 기준가다. */
  closeAtOrAfter(symbol: string, at: Date, timeframe: PriceTimeframe): Promise<number | null>;
  /** `at` 이전 마지막 종가(`notBefore` 보다 오래된 봉 제외) — 국내 주식 거래일 채점(F011 FR-64) */
  closeAtOrBefore(
    symbol: string,
    at: Date,
    timeframe: PriceTimeframe,
    notBefore: Date
  ): Promise<{ close: number; timestamp: Date } | null>;
  /** 심볼별 봉 수 — 국내 주식 코치 해제 조건(일봉 120 거래일, F011 FR-62) */
  candleCounts(symbols: string[], timeframe: PriceTimeframe): Promise<Map<string, number>>;
  /** `[from, to]` 5분봉 최고 종가. 5분봉은 30일 보관이라 그보다 오래된 구간은 `null` */
  highestCloseBetween(symbol: string, from: Date, to: Date): Promise<number | null>;
  latestCloses(symbols: string[]): Promise<ClosePoint[]>;
  /**
   * 한 심볼의 종가 백분위. `coach` 의 관찰 구간(F004 · D2)이 쓴다 — 가격 목표가 아니라
   * 과거 분포다.
   */
  closePercentiles(
    symbol: string,
    timeframe: PriceTimeframe,
    since: Date,
    fractions: number[]
  ): Promise<ClosePercentiles>;
  /**
   * 심볼들의 사람이 읽는 이름 · 로고 — 코치 사례의 종목 표시(F011 슬라이스 7b, "종목이 나오는 자리엔 아이콘").
   * 국내 주식은 마스터(유니버스 밖 · 상폐 포함, 로고는 `krStockLogoUrl`), 코인은 시세 표. 모르는 심볼은 빠진다 —
   * 국내 주식이 꺼져 있으면 코인만
   */
  assetLabels(symbols: string[]): Promise<Array<{ symbol: string; name: string; logoUrl: string | null }>>;
  /**
   * 한 심볼 밤사이 갭 분포 — 국내 주식 사이즈 계산의 "과거 최악 갭"(F011 `SRV-REQ-040` FR-45). `bounds` 밖 비율은
   * 원천 끊김이라 세지 않는다
   */
  overnightGapStats(
    symbol: string,
    timeframe: PriceTimeframe,
    since: Date,
    fraction: number,
    bounds: { min: number; max: number }
  ): Promise<OvernightGapStats>;
  /**
   * `[from, to)` 국내 주식 전 종목 일간 수익률 요약(F011 `SRV-REQ-040` FR-47 복권형 단면). `bounds` 밖 비율은 원천 끊김이라
   * 세지 않고, 수익률이 `minReturns` 미만인 종목은 빠진다. 국내 주식이 꺼져 있어도 저장된 일봉으로 답한다
   */
  krDailyReturnProfiles(
    from: Date,
    to: Date,
    minReturns: number,
    bounds: { min: number; max: number }
  ): Promise<DailyReturnProfile[]>;
  /**
   * 심리 구간별 사후 수익률 분포. `coach` 의 게이지 적중률(F004 · B9)이 일 1회 읽는다.
   * 심리와 종가가 둘 다 `market` 의 것이라 합치는 것도 여기서 한다.
   */
  sentimentForwardReturns(
    query: SentimentForwardReturnQuery
  ): Promise<SentimentForwardReturn[]>;
  /**
   * 누군가의 관심 목록에 있는 크립토 심볼 전체 — **사용자를 구분하지 않는다.**
   * `coach` 의 종목 판단 스냅샷(F004 · D11)이 추적 자산을 만들 때 쓴다.
   */
  watchedSymbols(): Promise<string[]>;
  /**
   * 국내 주식 판단 대상 = 시세를 모으는 유니버스(보유 → 관심 → 시총 상위, F011 FR-11). 꺼져 있으면 빈 배열.
   * 재료(시세 · 일봉 · 지표)가 있는 종목만 판단한다 — 관심 · 보유만 보면 장기 표본 20 이 몇 년 걸린다
   */
  krJudgmentUniverse(): Promise<string[]>;
  /** 거래대금 상위 코인 n — 화면 시세 목록(limit=100)과 같은 순서. 패널 칸 채움 실측(OPS-004)이 쓴다 */
  topCryptoByTradeValue(n: number): Promise<string[]>;
  /**
   * 오늘 왜 움직였나 카드(① 분해 · ② 같은 날 사실 · 카드 조건) — coach 의 ③ 한 줄 재료(F016 단계 D · `SRV-REQ-052` FR-1).
   * 화면 경로와 같은 유스케이스 그대로(저장값만 · 외부 호출 0). 없는 종목 · 국내 꺼짐이면 `null`
   */
  whyMovedCard(asset: "kr" | "crypto", symbol: string, opts?: { cause?: boolean }): Promise<WhyMovedCardView | null>;
  /**
   * 거래 기록이 국내 주식 코드를 받기 전 확인(F011 슬라이스 3b) — 꺼져 있으면 `KrStockDisabledError`(503),
   * 코드 형식 · 마스터에 없음은 같은 `KrStockNotAvailableError`(404 — 관심 종목 추가와 같은 규칙).
   * 통과하면 마스터 이름
   */
  krStockListing(code: string): Promise<{ code: string; name: string }>;
  /** 저장된 국내 주식 현재가(`kr_stock_quotes`). 꺼져 있거나 시세가 없는 코드는 빠진다 — 보유 평가가 쓴다 */
  krStockPrices(codes: string[]): Promise<Array<{ code: string; price: number; priceUpdatedAt: Date }>>;
}

export type {
  AssetQuote,
  ClosePercentiles,
  DailyReturnProfile,
  OvernightGapStats,
  ClosePoint,
  PriceTimeframe,
  SentimentForwardReturn,
  SentimentForwardReturnQuery,
  StoredIndicator,
  StoredSentiment,
  StoredWhaleTransaction,
};

/** `whyMovedCard` 응답 — 도메인 타입 0(`ddd-application.md` §6). 시각은 ISO 문자열 */
export interface WhyMovedCardView {
  date: string;
  show: boolean;
  split: { total: number; market: number; sector: number | null; idio: number; method: "regression" | "market_adjusted" | "benchmark" } | null;
  facts: Array<{ id: string; kind: string; at: string; source: string; title: string; value: number | null }>;
  /**
   * 원인 → 근거 → 결과(F017 v4 1b · `SRV-REQ-053` FR-11) — `opts.cause: true` 일 때만. 아니면 null(③ 한 줄 배치는 원인 재료를
   * 읽지 않는다 — 종목마다 리더 넷이 더 돈다). 코치 한 장 패널(1d)이 쓴다
   */
  cause: WhyMovedCauseView | null;
}

/** 원인 칸 — 도메인 타입 0. 모양은 화면 경로 `…/why-moved` 의 `cause` 와 같다 */
export interface WhyMovedCauseView {
  causes: Array<{
    kind: string;
    strength: "likely" | "possible" | "none";
    headline: string;
    note: string;
    factId: string | null;
    at: string | null;
    evidence: Array<{ kind: string; value: string; compare: string | null; gloss: string | null; source: string; at: string | null; supports: boolean }>;
  }>;
  result: { changeRate: number; text: string; past: string | null };
}

export interface MarketDependencies {
  assets: MarketAssetRepository;
  watchlist: WatchlistRepository;
  sentiments: SentimentRepository;
  whales: WhaleTransactionRepository;
  prices: PriceHistoryRepository;
  indicators: IndicatorRepository;
  exchange: ExchangeQuotePort;
  trades: TradeHistoryPort;
  fearGreed: FearGreedPort;
  news: SymbolNewsPort;
  /** 시장 요약 띠의 종목 · 임계 — 설정값(`MARKET_SUMMARY_*`)이다 */
  summaryPolicy: MarketSummaryPolicy;
  /**
   * 국내 주식(F011). **KIS 키가 없으면 `null`** — 워커가 등록되지 않고 경로는 503 이다(FR-6).
   * 코인 의존과 묶지 않는다: KIS 장애 · 미설정이 코인 시세를 막지 않는다
   */
  krStock: KrStockDependencies | null;
  /** 다가오는 국내 시장 일정(`SRV-REQ-041` FR-5) — 예측 DB 뷰. 국내 주식 키와 무관하게 늘 있다 */
  schedule: MarketScheduleReader;
  /** 추적 자산 상한(`SRV-REQ-008` FR-80~87) — 보유는 `portfolio` 의 사실이라 조립 지점이 넣는다. 상한은 `TRACKED_ASSET_LIMIT` */
  tracking: { held: HoldingProbe; limit: number };
  /** 오늘 왜 움직였나(F016 단계 C) — 예측 배치 β · σ 뷰 · 코인 경보 스냅샷 · 카드 문턱(설정) */
  move: MoveDependencies;
  /** 소식 측정 태그(F017 단계 6 · `SRV-REQ-053` FR-6) — 예측 뷰 셋(사전 · 서술 · 선반영). 국내 소식 · 코인 종목 뉴스가 같이 쓴다 */
  newsTags: NewsTagReader;
  /** 수집 따라잡기 · 추적 목록 스냅샷(`SRV-REQ-057` FR-2 · 7, `DB-REQ-044`) — 코인 보유는 `portfolio` 의 사실이라 조립 지점이 넣는다 */
  collection: {
    fillMarks: PriceFillMarkStore;
    universeSnapshots: UniverseSnapshotStore;
    heldCryptoSymbols: () => Promise<string[]>;
  };
}

export interface KrStockDependencies {
  kis: KrStockQuotePort;
  master: KrStockMasterSource;
  store: KrStockStore;
  calendar: KrMarketCalendarStore;
  /** WS 실시간 체결(슬라이스 1) — 앱 키당 세션 하나라 프로세스에 하나 */
  realtime: KrRealtimePort;
  /** KIS REST 건강 상태 · 지표(FR-92 · 94) — `KisClient` 가 호출 결과로 센다 */
  health: KrProviderHealthPort;
  /** 보유 코드 — 유니버스 첫 순위(FR-11). `portfolio` 의 사실이라 조립 지점이 넣는다 */
  held: KrHeldCodesSource;
  /** 시총 상위 N(`KIS_UNIVERSE_TOP_N`) */
  universeTopN: number;
  /** logo.dev 퍼블리셔블 키(`KR_LOGO_DEV_TOKEN`) — 없으면 로고 없음(화면 이니셜, `krStockLogoUrl`) */
  logoDevToken?: string;
  /** 로고 이미지 받기 — 선명도 판정(`ResolveKrStockLogos`) */
  logoImages: KrLogoImageProbe;
  /** DART 기업개황 홈페이지 — 키(`DART_API_KEY`)가 없으면 `null`(도메인 조회 없이 티커만) */
  homepages: KrCompanyHomepageSource | null;
  /** 지수 · 투자자 동향 · 호가 조회(슬라이스 6 · 6b) — 같은 `KisClient` 라 한도를 같은 페이서가 지킨다 */
  supplementSource: KrSupplementPort;
  supplement: KrSupplementStore;
  /** 요약 지수 코드(`KIS_SUMMARY_INDICES`) — 수집 대상. 요약 띠 지수(`summaryPolicy`)도 여기 들어 있어야 분 기록이 쌓인다 */
  summaryIndices: readonly string[];
  /** 국내 요약 띠(`SRV-REQ-042`) — 대표 · 지수 칸 · 태그 임계(`KR_SUMMARY_*`) */
  summaryPolicy: KrSummaryPolicy;
  /** VI 현황 조회(F016 단계 A) — 같은 `KisClient` 라 한도를 같은 페이서가 지킨다 */
  statusSource: KrMarketStatusPort;
  /** VI 사건 · 시장 조치 */
  status: KrMarketStatusStore;
  /** 시황/공시 제목 · 업종 지수 · 장중 프로그램 매매 조회(F016 단계 B) — 같은 `KisClient` 라 한도를 같은 페이서가 지킨다 */
  moveSourceSource: KrMoveSourcePort;
  moveSources: KrMoveSourceStore;
  /** 광고성 제목 패턴(`KR_NEWS_PROMO_PATTERNS`) — 표시에서 뺀다 */
  newsPromoPatterns: readonly RegExp[];
  /** 기사 본문(`SRV-REQ-054`) — `news` 공개 API ACL */
  articleBody?: KrArticleBodyPort;
}

export interface KrStockUseCases {
  syncMaster: SyncKrStockMaster;
  syncCalendar: SyncKrMarketCalendar;
  syncDailyCandles: SyncKrDailyCandles;
  /** 전 종목 일봉 5년(FR-40) — 밤 · 주말만 */
  syncFullDailyCandles: SyncKrFullDailyCandles;
  pollQuotes: PollKrStockQuotes;
  syncMinuteBars: SyncKrMinuteBars;
  /** 실시간 슬롯 밖 종목 장중 5분봉(`SRV-REQ-057` FR-5) */
  syncSlotlessMinuteBars: SyncKrSlotlessMinuteBars;
  /** 유니버스에 새로 든 종목 즉시 백필(`SRV-REQ-057` FR-4) */
  backfillUniverseJoiners: BackfillKrUniverseJoiners;
  realtime: RunKrRealtime;
  reportMetrics: ReportKrProviderMetrics;
  /** 종목별 로고 출처 판정(도메인 → 티커 → 없음) — 하루 한 번 · 30일마다 다시 */
  resolveLogos: ResolveKrStockLogos;
  getSession: GetKrMarketSession;
  listQuotes: ListKrStockQuotes;
  getDetail: GetKrStockDetail;
  getChart: GetKrStockChart;
  search: SearchKrStocks;
  /** 코스피 · 코스닥 현재값 — 현재가 회차 뒤 매분(부를지는 유스케이스가 정한다) */
  pollIndices: PollKrIndices;
  /** 시간외 단일가 — 현재가 회차 뒤 매분(16:11 … 18:01 10분마다만 부른다) */
  pollAfterHours: PollKrAfterHours;
  /** 투자자 순매수 — 개장일 저녁 한 번 */
  syncInvestorFlows: SyncKrInvestorFlows;
  getIndices: GetKrIndices;
  /** 국내 요약 띠 — 코인 요약과 같은 모양(`SRV-REQ-042`) */
  getSummary: GetKrMarketSummary;
  /** 지수 분 기록 정리 — 장 마감 뒤 하루 한 번(`DB-REQ-035` FR-2) */
  pruneIndexTicks: PruneKrIndexTicks;
  getInvestorFlows: GetKrInvestorFlows;
  /** 호가 10단계 — 요청 시점 조회 · 10초 캐시(슬라이스 6b) */
  getOrderbook: GetKrOrderbook;
  /** VI 현황 — 지수 회차 뒤 매분(정규장만, F016 단계 A) */
  pollViEvents: PollKrViEvents;
  /** 서킷브레이커 추정 — 지수 회차 뒤 매분(오늘 분 기록 전체를 다시 본다) */
  inferMarketActions: InferKrMarketActions;
  /** 시황/공시 제목 — 시장 전체 한 번(07~20시 2분 · 그 밖 30분, F016 단계 B) */
  pollNewsTitles: PollKrNewsTitles;
  backfillNewsTitles: BackfillKrNewsTitles;
  /** 업종 지수 — 지수 회차와 같은 박자 */
  pollSectorIndices: PollKrSectorIndices;
  /** 장중 프로그램 매매 — 유니버스 10분마다 */
  pollProgramFlows: PollKrProgramFlows;
  /** 제목 30일 · 장중 수급 7일 · VI 30일 정리 — 장 마감 뒤 하루 한 번 */
  pruneMoveSources: PruneKrMoveSources;
  /** 지수 · 업종 일별 이력(β 재료, F016 단계 C) — 장 마감 뒤 하루 한 번 + 기동 때 */
  backfillIndexDaily: BackfillKrIndexDaily;
  getNews: GetKrStockNews;
  getNewsBody: GetKrNewsBody;
  getIntradayFlows: GetKrIntradayFlows;
  /** 오늘 왜 움직였나 — ① 분해 · ② 같은 날 사실 · 카드 조건(F016 단계 C) */
  getWhyMoved: GetKrWhyMoved;
}

const createKrStockUseCases = (
  deps: KrStockDependencies,
  schedule: MarketScheduleReader,
  move: MoveDependencies,
  snapshots: UniverseSnapshotStore,
  tagNews: TagNews
): KrStockUseCases => {
  const universe = new ResolveKrStockUniverse(deps.store, deps.held, deps.universeTopN);
  const realtime = new RunKrRealtime(deps.realtime, deps.store, deps.calendar, universe);
  const syncDailyCandles = new SyncKrDailyCandles(deps.kis, deps.store, universe);
  const syncMinuteBars = new SyncKrMinuteBars(deps.kis, deps.store, deps.calendar, universe);
  const provider = () => {
    const h = deps.health.snapshot();
    return {
      status: h.status,
      since: h.since?.toISOString() ?? null,
      lastSuccessAt: h.lastSuccessAt?.toISOString() ?? null,
      realtime: realtime.status(),
    };
  };
  const read = {
    store: deps.store,
    calendar: deps.calendar,
    provider,
    logoDevToken: deps.logoDevToken,
    supplement: deps.supplement,
    summaryIndices: deps.summaryIndices,
    orderbookSource: deps.supplementSource,
    universe,
    status: deps.status,
    moveSources: deps.moveSources,
    move,
    articleBody: deps.articleBody,
    tagNews,
  };
  return {
    syncMaster: new SyncKrStockMaster(deps.master, deps.store),
    syncCalendar: new SyncKrMarketCalendar(deps.kis, deps.calendar),
    syncDailyCandles,
    syncFullDailyCandles: new SyncKrFullDailyCandles(deps.kis, deps.store),
    pollQuotes: new PollKrStockQuotes(deps.kis, deps.store, deps.calendar, universe),
    syncMinuteBars,
    syncSlotlessMinuteBars: new SyncKrSlotlessMinuteBars(deps.kis, deps.store, deps.calendar, universe, () =>
      deps.realtime.subscribed()
    ),
    backfillUniverseJoiners: new BackfillKrUniverseJoiners(universe, snapshots, syncDailyCandles, syncMinuteBars),
    realtime,
    reportMetrics: new ReportKrProviderMetrics(deps.health),
    resolveLogos: new ResolveKrStockLogos({
      store: deps.store,
      universe,
      images: deps.logoImages,
      homepages: deps.homepages,
      logoDevToken: deps.logoDevToken,
    }),
    getSession: new GetKrMarketSession(read),
    listQuotes: new ListKrStockQuotes(read),
    getDetail: new GetKrStockDetail(read),
    getChart: new GetKrStockChart(read),
    search: new SearchKrStocks(read),
    pollIndices: new PollKrIndices(deps.supplementSource, deps.supplement, deps.calendar, deps.summaryIndices),
    syncInvestorFlows: new SyncKrInvestorFlows(deps.supplementSource, deps.supplement, deps.calendar, universe),
    pollAfterHours: new PollKrAfterHours(deps.supplementSource, deps.supplement, deps.calendar, universe),
    getIndices: new GetKrIndices(read),
    getSummary: new GetKrMarketSummary({
      store: deps.store,
      supplement: deps.supplement,
      universe,
      schedule,
      policy: deps.summaryPolicy,
      status: deps.status,
      calendar: deps.calendar,
      logoDevToken: deps.logoDevToken,
    }),
    pruneIndexTicks: new PruneKrIndexTicks(deps.supplement),
    getInvestorFlows: new GetKrInvestorFlows(read),
    getOrderbook: new GetKrOrderbook(read),
    pollViEvents: new PollKrViEvents(deps.statusSource, deps.status, deps.calendar),
    inferMarketActions: new InferKrMarketActions(deps.supplement, deps.status, deps.calendar),
    pollNewsTitles: new PollKrNewsTitles(deps.moveSourceSource, deps.moveSources, deps.newsPromoPatterns),
    backfillNewsTitles: new BackfillKrNewsTitles(deps.moveSourceSource, deps.moveSources, deps.newsPromoPatterns),
    pollSectorIndices: new PollKrSectorIndices(deps.moveSourceSource, deps.moveSources, deps.calendar, universe),
    pollProgramFlows: new PollKrProgramFlows(deps.moveSourceSource, deps.moveSources, deps.calendar, universe),
    pruneMoveSources: new PruneKrMoveSources(deps.moveSources),
    backfillIndexDaily: new BackfillKrIndexDaily(deps.moveSourceSource, deps.moveSources, universe),
    getNews: new GetKrStockNews(read),
    getNewsBody: new GetKrNewsBody(read),
    getIntradayFlows: new GetKrIntradayFlows(read),
    getWhyMoved: new GetKrWhyMoved(read, move),
  };
};

export interface MarketUseCases {
  calculateSentiment: CalculateSentiment;
  trackSmartMoney: TrackSmartMoney;
  getMarketDashboard: GetMarketDashboard;
  collectWhaleTrades: CollectWhaleTrades;
  getSentimentHistory: GetSentimentHistory;
  listWhaleTransactions: ListWhaleTransactions;
  getSymbolNews: GetSymbolNews;
  addToWatchlist: AddToWatchlist;
  listWatchlist: ListWatchlist;
  /** 종목 검색 — 코인 + 국내 한 검색(`FEATURE-000` FR-40) */
  searchAssets: SearchAssets;
  /** 검색 모달 2단계(`SRV-REQ-055`) — 업종 · 지수 · 뉴스 묶음 · 뜨는 업종 · 곁 칸 */
  searchResultGroups: SearchResultGroups;
  readRisingSectors: ReadRisingSectors;
  readSearchRelated: ReadSearchRelated;
  removeFromWatchlist: RemoveFromWatchlist;
  listWatchlistSymbols: ListWatchlistSymbols;
  updateWatchlistPrices: UpdateWatchlistPrices;
  getMarketOverview: GetMarketOverview;
  /** 코인 오늘 왜 움직였나(F016 단계 C) — 없는 종목이면 404 */
  getCryptoWhyMoved: GetCryptoWhyMoved;
  getMarketSummary: GetMarketSummary;
  getRealTimePrice: GetRealTimePrice;
  getChartData: GetChartData;
  listMarketSymbols: ListMarketSymbols;
  syncMarketListings: SyncMarketListings;
  updateAllMarketPrices: UpdateAllMarketPrices;
  collectPriceHistory: CollectPriceHistory;
  /** 코인 5분봉 따라잡기(`SRV-REQ-057` FR-2) — 정기 회차 뒤 · 깸 */
  catchUpPriceHistory: CatchUpPriceHistory;
  /** 추적 목록 일별 스냅샷(`SRV-REQ-057` FR-7) */
  captureUniverseSnapshot: CaptureUniverseSnapshot;
  backfillDailyHistory: BackfillDailyHistory;
  refreshTechnicalIndicators: RefreshTechnicalIndicators;
  /** 키가 없으면 `null`(FR-6) */
  krStock: KrStockUseCases | null;
  /** 국내 시장 일정 — 키가 없어도 있다(일정은 예측 DB 에서 온다) */
  getKrMarketSchedule: GetKrMarketSchedule;
}

export const createMarketApplication = (deps: MarketDependencies) => {
  const tagNews = new TagNews(deps.newsTags);
  // 국내 주식 관심 종목 — 키가 없으면 `null`(담을 수 없고 목록에서도 빠진다, F011 슬라이스 3)
  const krWatchlist = deps.krStock
    ? { store: deps.krStock.store, logoDevToken: deps.krStock.logoDevToken }
    : null;
  const krSearch = deps.krStock
    ? {
        store: deps.krStock.store,
        moveSources: deps.krStock.moveSources,
        supplement: deps.krStock.supplement,
        logoDevToken: deps.krStock.logoDevToken,
      }
    : null;
  const krUniverse = deps.krStock
    ? new ResolveKrStockUniverse(deps.krStock.store, deps.krStock.held, deps.krStock.universeTopN)
    : null;
  const calculateSentiment = new CalculateSentiment(deps.exchange, deps.fearGreed, deps.sentiments);
  const trackSmartMoney = new TrackSmartMoney(deps.exchange, deps.whales);
  const useCases: MarketUseCases = {
    calculateSentiment,
    trackSmartMoney,
    getMarketDashboard: new GetMarketDashboard(calculateSentiment, trackSmartMoney),
    collectWhaleTrades: new CollectWhaleTrades(
      deps.trades,
      deps.assets,
      deps.watchlist,
      deps.whales
    ),
    getSentimentHistory: new GetSentimentHistory(deps.sentiments),
    listWhaleTransactions: new ListWhaleTransactions(deps.whales),
    getSymbolNews: new GetSymbolNews(deps.news, tagNews),
    addToWatchlist: new AddToWatchlist(deps.watchlist, deps.exchange, krWatchlist, deps.tracking),
    // 관심 목록이 자산 표를 함께 읽는다 — 행에 가격이 없거나 오래된 심볼을 보정한다
    // (`SRV-REQ-008` FR-33). 두 리포지토리 다 이 컨텍스트 것이라 경계를 넘지 않는다.
    listWatchlist: new ListWatchlist(deps.watchlist, deps.assets, krWatchlist, deps.tracking),
    searchAssets: new SearchAssets(deps.watchlist, deps.assets, deps.tracking, krWatchlist),
    searchResultGroups: new SearchResultGroups(deps.news, deps.assets, krSearch),
    readRisingSectors: new ReadRisingSectors(krSearch),
    readSearchRelated: new ReadSearchRelated(deps.news, deps.assets, krSearch),
    removeFromWatchlist: new RemoveFromWatchlist(deps.watchlist),
    listWatchlistSymbols: new ListWatchlistSymbols(deps.watchlist),
    updateWatchlistPrices: new UpdateWatchlistPrices(deps.watchlist),
    getMarketOverview: new GetMarketOverview(
      deps.assets,
      deps.exchange,
      deps.prices,
      undefined,
      deps.move
    ),
    getCryptoWhyMoved: new GetCryptoWhyMoved(deps.assets, deps.news, deps.move, undefined, tagNews),
    getMarketSummary: new GetMarketSummary(
      deps.assets,
      deps.exchange,
      deps.news,
      deps.summaryPolicy
    ),
    getRealTimePrice: new GetRealTimePrice(deps.exchange),
    getChartData: new GetChartData(deps.exchange),
    listMarketSymbols: new ListMarketSymbols(deps.assets),
    syncMarketListings: new SyncMarketListings(deps.assets, deps.exchange),
    updateAllMarketPrices: new UpdateAllMarketPrices(deps.assets, deps.exchange),
    collectPriceHistory: new CollectPriceHistory(
      deps.assets,
      deps.exchange,
      deps.prices,
      deps.collection.fillMarks
    ),
    catchUpPriceHistory: new CatchUpPriceHistory(
      deps.assets,
      deps.exchange,
      deps.prices,
      deps.collection.fillMarks,
      deps.watchlist,
      deps.collection.heldCryptoSymbols
    ),
    captureUniverseSnapshot: new CaptureUniverseSnapshot(
      deps.assets,
      deps.collection.universeSnapshots,
      deps.krStock ? { store: deps.krStock.store, held: deps.krStock.held, topN: deps.krStock.universeTopN } : null
    ),
    backfillDailyHistory: new BackfillDailyHistory(
      deps.assets,
      deps.exchange,
      deps.prices
    ),
    // 국내 주식도 같은 지표를 만든다(F011 FR-60) — 대상은 시세 유니버스. 꺼져 있으면 코인만
    refreshTechnicalIndicators: new RefreshTechnicalIndicators(
      deps.assets,
      deps.prices,
      deps.indicators,
      krUniverse ? () => krUniverse.execute() : null
    ),
    krStock: deps.krStock ? createKrStockUseCases(deps.krStock, deps.schedule, deps.move, deps.collection.universeSnapshots, tagNews) : null,
    getKrMarketSchedule: new GetKrMarketSchedule(deps.schedule),
  };

  const api: MarketApi = {
    krNewsTitlesForAiBody: async (since, limit) => (deps.krStock ? deps.krStock.moveSources.newsTitlesForAiBody(since, limit) : []),
    latestIndicator: (symbol) => deps.indicators.findLatest(symbol),
    latestSentiment: (symbol) => deps.sentiments.findLatest(symbol),
    recentWhaleTransactions: (symbol, limit = 20) =>
      deps.whales.findRecent(symbol, limit),
    closesSince: (symbols, since) => deps.prices.closesSince(symbols, since),
    latestIndicators: (symbols, timeframe) =>
      deps.indicators.findLatestMany(symbols, timeframe),
    latestSentiments: (symbols) => deps.sentiments.findLatestMany(symbols),
    assetQuotes: async (symbols) => {
      const krCodes = deps.krStock ? symbols.filter(isKrStockCode) : [];
      const [crypto, kr] = await Promise.all([
        deps.assets.findQuotes(symbols),
        krCodes.length > 0 && deps.krStock
          ? deps.krStock.store.quotes({ codes: krCodes, limit: krCodes.length, offset: 0 })
          : [],
      ]);
      return [
        ...crypto,
        ...kr.map((q) => ({
          symbol: q.code,
          assetType: "kr_stock" as const,
          koreanName: q.name,
          currentPrice: q.price,
          // 전일 종가 대비(%) — 코인의 24시간 변동률 자리. 장기 판단은 이 값과 일봉 RSI 만 쓴다
          change24h: q.changeRate,
          tradeValue24h: q.tradeValue,
          priceUpdatedAt: q.priceUpdatedAt,
          openPrice: q.openPrice,
        })),
      ];
    },
    recentWhalesForSymbols: (symbols, limit = 100) =>
      deps.whales.findRecentForSymbols(symbols, limit),
    highestCloseSince: (symbols, since) =>
      deps.prices.highestCloseSince(symbols, since),
    closeAtOrAfter: (symbol, at, timeframe) => deps.prices.closeAtOrAfter(symbol, at, timeframe),
    closeAtOrBefore: (symbol, at, timeframe, notBefore) =>
      deps.prices.closeAtOrBefore(symbol, at, timeframe, notBefore),
    candleCounts: (symbols, timeframe) => deps.prices.candleCounts(symbols, timeframe),
    highestCloseBetween: (symbol, from, to) => deps.prices.highestCloseBetween(symbol, from, to),
    latestCloses: (symbols) => deps.prices.latestCloses(symbols),
    closePercentiles: (symbol, timeframe, since, fractions) =>
      deps.prices.closePercentiles(symbol, timeframe, since, fractions),
    assetLabels: async (symbols) => {
      if (symbols.length === 0) return [];
      const krCodes = deps.krStock ? symbols.filter(isKrStockCode) : [];
      const [coins, kr] = await Promise.all([
        deps.assets.findViews(symbols),
        krCodes.length > 0 && deps.krStock ? deps.krStock.store.labels(krCodes) : [],
      ]);
      const labels = new Map<string, { symbol: string; name: string; logoUrl: string | null }>();
      for (const view of coins) {
        labels.set(view.symbol, { symbol: view.symbol, name: view.koreanName ?? view.symbol, logoUrl: view.logoUrl || null });
      }
      // 6자리 코드는 국내 주식이 먼저 — 코인 심볼과 겹치면 마스터에 있는 쪽이 그 코드의 주인이다
      for (const row of kr) {
        labels.set(row.code, { symbol: row.code, name: row.name, logoUrl: krStockLogoUrl(row, deps.krStock?.logoDevToken) });
      }
      return [...labels.values()];
    },
    overnightGapStats: (symbol, timeframe, since, fraction, bounds) =>
      deps.prices.overnightGapStats(symbol, timeframe, since, fraction, bounds),
    krDailyReturnProfiles: (from, to, minReturns, bounds) =>
      deps.prices.krDailyReturnProfiles(from, to, minReturns, bounds),
    watchedSymbols: () => deps.watchlist.distinctSymbols("crypto"),
    krJudgmentUniverse: async () => (krUniverse ? krUniverse.execute() : []),
    topCryptoByTradeValue: (n) => deps.assets.topByTradeValue("crypto", n),
    // ③ 한 줄 배치의 재료 — 원인 칸을 쓰지 않으니 원인 근거 재료를 읽지 않는다(F017 v4 1b 확인 2회차). 한 장 패널만 `cause: true`
    whyMovedCard: async (asset, symbol, opts = {}) => {
      const cause = opts.cause === true;
      try {
        const view =
          asset === "kr"
            ? useCases.krStock
              ? await useCases.krStock.getWhyMoved.execute(symbol, { cause })
              : null
            : await useCases.getCryptoWhyMoved.execute(symbol, { cause });
        if (!view) return null;
        return {
          date: view.date,
          show: view.show,
          split: view.split && { total: view.split.total, market: view.split.market, sector: view.split.sector, idio: view.split.idio, method: view.split.method },
          facts: view.facts.map((f) => ({ id: f.id, kind: f.kind, at: f.at, source: f.source, title: f.title, value: f.value })),
          cause: cause
            ? {
                causes: view.cause.causes.map((c) => ({
                  kind: c.kind,
                  strength: c.strength,
                  headline: c.headline,
                  note: c.note,
                  factId: c.factId,
                  at: c.at,
                  evidence: c.evidence.map((e) => ({
                    kind: e.kind,
                    value: e.value,
                    compare: e.compare,
                    gloss: e.gloss,
                    source: e.source,
                    at: e.at,
                    supports: e.supports,
                  })),
                })),
                result: { changeRate: view.cause.result.changeRate, text: view.cause.result.text, past: view.cause.result.past },
              }
            : null,
        };
      } catch (error) {
        // 없는 종목 · 국내 마스터에 없음은 "카드 없음" — 그 밖은 부르는 쪽이 회차 실패로 센다
        if (error instanceof KrStockNotAvailableError || error instanceof UnknownMarketSymbolError) return null;
        throw error;
      }
    },
    krStockListing: async (code) => {
      const kr = deps.krStock;
      if (!kr) throw new KrStockDisabledError();
      if (!isKrStockCode(code)) throw new KrStockNotAvailableError();
      const listing = await kr.store.findListing(code);
      if (!listing) throw new KrStockNotAvailableError();
      return { code: listing.code, name: listing.name };
    },
    krStockPrices: async (codes) => {
      if (!deps.krStock || codes.length === 0) return [];
      const rows = await deps.krStock.store.quotes({ codes, limit: codes.length, offset: 0 });
      return rows.map((q) => ({ code: q.code, price: q.price, priceUpdatedAt: q.priceUpdatedAt }));
    },
    sentimentForwardReturns: (query) =>
      deps.sentiments.forwardReturnsByBucket(query),
  };

  return { api, useCases };
};
