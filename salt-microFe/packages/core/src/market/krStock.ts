/**
 * 국내 주식 화면 계약 — `GET /api/app/market/kr/*` 응답 `data` · WS `price_update`(`assetType: "kr_stock"`)
 * (F011 슬라이스 3 · `FE-REQ-041`).
 *
 * BFF `kr-stock.viewmodel.ts`(`BFF-REQ-040`)가 소유하는 계약의 사본이다. 금액 · 등락 · 호가 단위 · 상하한 도달 ·
 * 상태 배지 · 시세 지연(`feed`)은 **전부 서버 값**이다(공통 수용 기준 3). 여기 있는 함수는 KST 시각을 글자로
 * 바꾸는 **표시 규칙**뿐이다 — 브라우저 시간대와 무관하게 같은 글자가 나와야 서버 렌더 · 뉴욕 브라우저에서 어긋나지 않는다.
 */

export type KrSession =
  | "pre_open"
  | "regular"
  | "closing_auction"
  | "after_hours_close"
  | "after_hours_single"
  | "closed"
  | "holiday";

/**
 * 종목 상태 칩 — 서버 `krStatusBadges`. F016 단계 A(2026-11-06)에 `paused`(임시정지) · `vi` · `attention`(투자유의) ·
 * `liquidation`(정리매매)을 더했다
 */
export type KrStatusBadge =
  | "halted"
  | "paused"
  | "vi"
  | "administrative"
  | "caution"
  | "warning"
  | "danger"
  | "attention"
  | "liquidation"
  | "overheat";

export type KrViKind = "static" | "dynamic" | "both";

/** VI 발동 중일 때만(F016 단계 A) — 종류 · 발동 시각을 못 받았으면 `null`(칩은 선다) */
export interface KrVi {
  kind: KrViKind | null;
  triggeredAt: string | null;
  count: number | null;
}

/**
 * 오늘 시장 조치(F016 단계 A · `BFF-REQ-051` FR-2) — 서킷브레이커 · 사이드카. 띠를 보일지(`active`) · 재개 예정(`resumesAt`)은
 * 서버 값. `source: "inferred"` 면 "추정"을 붙인다
 */
export interface KrMarketAction {
  market: KrMarket;
  kind: "circuit_breaker" | "sidecar";
  stage: number;
  direction: "up" | "down";
  startedAt: string;
  endedAt: string | null;
  resumesAt: string | null;
  source: "feed" | "inferred";
  active: boolean;
}

/** `realtime` = WS 슬롯 안 · `poll_1m` = 1분 조회 · `stale` = KIS 장애 · 한도로 오래된 값(FR-45) */
export type KrFeed = "realtime" | "poll_1m" | "stale";

export type KrMarket = "KOSPI" | "KOSDAQ";

export type KrRealtimeState = "idle" | "connecting" | "open" | "backoff" | "degraded";

export type KrChartPeriod = "1d" | "5m";

/** BFF 가 서버 503 키 없음 → `disabled`, 그 밖 5xx · 계약 깨짐 → `unavailable` 로 바꾼다 */
export type KrResult<T> = ({ status: "ok" } & T) | { status: "disabled" } | { status: "unavailable" };

export interface KrSessionView {
  session: KrSession;
  now: string;
  /** 마지막 정규장 마감(15:30 KST) — 정규장 중이면 `null` */
  lastCloseAt: string | null;
  /** 다음 정규장 시작(09:00 KST) — 정규장 중이면 `null` */
  nextOpenAt: string | null;
  /** `false` 면 오늘이 개장일 달력에 없어 평일 = 개장으로 **추정**했다. 화면이 숨기지 않는다 */
  calendarKnown: boolean;
  /** 평일 휴장 사유(F011 FR-41) — 서버 KRX 공시 표 이름. 휴장이 아니거나 표에 없으면 `null` */
  holidayName: string | null;
}

export interface KrProviderView {
  status: "ok" | "degraded";
  since: string | null;
  lastSuccessAt: string | null;
  realtime: { state: KrRealtimeState; lastTickAt: string | null };
}

export interface KrMarketStatus extends KrSessionView {
  provider: KrProviderView;
}

export interface KrQuote {
  code: string;
  name: string;
  market: KrMarket;
  price: number;
  change: number;
  changeRate: number;
  /** 누적 거래량 — BigInt 문자열 */
  volume: string;
  tradeValue: number;
  marketCap: number | null;
  basePrice: number | null;
  upperLimit: number | null;
  lowerLimit: number | null;
  limitState: "upper" | "lower" | null;
  status: KrStatusBadge[];
  isHalted: boolean;
  vi: KrVi | null;
  /** 마지막 체결 — 서버가 **값이 멈춘 이유가 있을 때만**(정지 · VI · 서킷브레이커) 채운다. 있으면 그린다 */
  lastTradeAt: string | null;
  feed: KrFeed;
  priceUpdatedAt: string;
  /** 당일 시가 · 고가 · 저가 — KIS 현재가 응답(`FE-REQ-041` 계약 확장). 아직 받지 못한 행은 `null` */
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  /** 기간 수익률(%) — `period` 를 줬을 때만, 일봉 이력이 없으면 `null`. 서버 계산 */
  periodChange?: number | null;
  /** 표 행 — "왜 움직였나" 카드가 서는 날인가(F016 단계 C · 서버 판정). 표 응답에만 있다 */
  moveCard?: boolean;
  /** 로고 주소 — 서버가 종목마다 판정한 logo.dev 주소. 선명한 로고가 없으면 `null`, 못 불러오면 `AssetIcon` 이 이니셜로 넘어간다 */
  logoUrl: string | null;
  /**
   * 시간외 단일가(16:00~18:00 · F011 슬라이스 6b · `BFF-REQ-040` FR-30) — 현재가 · 등락과 따로다. 서버가 마지막 정규장 마감 뒤
   * 값만 주고 정규장이 열리면 `null`
   */
  afterHours: KrAfterHours | null;
}

export interface KrAfterHours {
  price: number;
  /** 정규장 종가 대비(원, 부호 포함) */
  change: number;
  changeRate: number;
  /** 시간외 누적 거래량 — BigInt 문자열 */
  volume: string;
  /** 받은 회차 시각 */
  at: string;
}

export interface KrOverview {
  session: KrSessionView;
  items: KrQuote[];
  nextOffset: number | null;
}

export interface KrStockDetailInfo {
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  week52High: number | null;
  week52Low: number | null;
  foreignRate: number | null;
  /** 호가 단위(원) — 서버가 현재가로 정한다(FR-42) */
  tickSize: number;
}

export interface KrStockDetail {
  session: KrSessionView;
  quote: KrQuote;
  detail: KrStockDetailInfo;
  /** 이 종목 시장의 오늘 조치 — 상세 머리 띠 */
  marketActions: KrMarketAction[];
}

/** 봉 시각은 ISO(UTC) — `candleTimeMs` 가 그대로 읽는다. 오래된 것이 앞이다 */
export interface KrCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KrChart {
  period: KrChartPeriod;
  candles: KrCandle[];
  /** 5분봉은 실시간 집계부터 쌓인다 — 몇 거래일치인지 숨기지 않는다(FR-46) */
  coverage: { from: string | null; to: string | null; tradingDays: number };
}

export interface KrSearchItem {
  code: string;
  name: string;
  market: KrMarket;
  /** 시세를 모으는 종목인가 — 아니면 상세가 404 다(마스터에만 있다) */
  inUniverse: boolean;
}

export interface KrSearchResult {
  items: KrSearchItem[];
}

/** WS `price_update.data` — 코인과 같은 이름에 `assetType` 만 더했다 */
export interface KrPriceUpdate {
  assetType: "kr_stock";
  symbol: string;
  currentPrice: number;
  /** 전일 종가 대비 등락률(%) */
  change24h: number;
  /** 전일 종가 대비 금액 */
  change24hAmount: number;
  timestamp: string;
}

/** 서버 · BFF 코드 규칙과 같다(`^[0-9A-Z]{6}$`) */
/** 지수 한 칸(F011 슬라이스 6 · `BFF-REQ-040` FR-27) — 이름 · 순서는 서버 설정. 값은 포인트 */
export interface KrIndex {
  code: string;
  name: string;
  value: number;
  change: number;
  changeRate: number;
  /** 상승 · 보합 · 하락 종목 수 — 없으면 `null` */
  advancers: number | null;
  unchanged: number | null;
  decliners: number | null;
  updatedAt: string;
  /** 시세 시간대인데 3분 넘게 안 바뀌었다(서버 판정) */
  stale: boolean;
}

export interface KrIndices {
  session: KrSessionView;
  items: KrIndex[];
}

/**
 * 다가오는 국내 시장 일정 — BFF `GET /api/app/market/kr/schedule`(F008 슬라이스 24, `BFF-REQ-043` FR-3).
 * 날짜 · 종류 · 남은 날만 — 과거 반응 분포(전망)는 없다. 종류 · 기간은 서버가 정한다
 */
export type KrScheduleKind = "kr_bok_rate" | "kr_cpi" | "kr_trade" | "kr_quad_expiry";

export interface KrScheduleItem {
  kind: KrScheduleKind;
  eventAt: string;
  /** KST 날짜 차이(서버 계산) — 0 = 오늘 */
  daysUntil: number;
}

export interface KrSchedule {
  days: number;
  items: KrScheduleItem[];
}

/**
 * 국내 요약 띠 한 칸 — BFF `GET /api/app/market/kr/summary`(`BFF-REQ-044`). 코인 요약 칸(`entities/market` `MarketSummaryItem`)과
 * **같은 이름 · 같은 뜻**이라 같은 칸 컴포넌트가 그린다. 등락은 전일 종가 대비(`changeBasis`), 지수는 로고가 없고(`null`),
 * 고가 · 저가 · 거래대금은 못 받았으면 `null`. 금액은 서버가 반올림했다(종목 원 정수 · 지수 포인트)
 */
export interface KrSummaryItem {
  symbol: string;
  /** 지수 칸은 링크가 없다(상세 화면이 없다) */
  kind: "index" | "stock";
  name: string;
  logoUrl: string | null;
  currentPrice: number;
  change24h: number;
  change24hAmount: number;
  tags: Array<"wide_move">;
  sparkline: number[] | null;
  high24h: number | null;
  low24h: number | null;
  tradeValue24h: number | null;
}

export interface KrMarketSummary {
  assetClass: "kr_stock";
  changeBasis: "prev_close";
  featured: KrSummaryItem | null;
  items: KrSummaryItem[];
  sparklineWindowMinutes: number;
  /** 스파크라인이 그린 날(KST `YYYY-MM-DD`) — 오늘이면 "오늘 장중" */
  sparklineDate: string | null;
  breadth: { up: number; flat: number; down: number; total: number } | null;
  /** 국내 뉴스는 모으지 않는다 — 늘 빈 배열. 그 자리는 `schedule` */
  headlines: [];
  schedule: KrScheduleItem[];
  /** 오늘 시장 조치 — 요약 띠 위 정지 띠 */
  marketActions: KrMarketAction[];
  degraded: boolean;
}

/** 순매수(매수 − 매도) — 수량은 주(문자열 — BigInt), 금액은 원 정수. 음수면 순매도 */
export interface KrInvestorNet {
  quantity: string;
  value: number;
}

export interface KrInvestorDay {
  /** 거래일(KST, YYYY-MM-DD) */
  date: string;
  individual: KrInvestorNet;
  foreign: KrInvestorNet;
  institution: KrInvestorNet;
}

/** 종목 투자자 순매수(`BFF-REQ-040` FR-28) — 최신이 앞. 아직 안 모였으면 `rows: []` · `totals: null` */
export interface KrInvestors {
  code: string;
  days: number;
  collectedAt: string | null;
  rows: KrInvestorDay[];
  /** 받은 거래일 합계 — 서버가 낸다 */
  totals: { individual: KrInvestorNet; foreign: KrInvestorNet; institution: KrInvestorNet } | null;
}

/** 오늘 소식 한 건(`BFF-REQ-051` FR-3 · F016 단계 B) — 시황/공시 제목. **링크 · 본문 없음**(원천에 없다) */
export interface KrNewsItem {
  id: string;
  kind: "news" | "disclosure";
  provider: string;
  title: string;
  publishedAt: string;
  /** 관련 종목 — 이름 · 지금 등락률(%, 시세 없으면 `null`). 뉴스 상세 모달 칩(`FE-REQ-065`) */
  related: Array<{ code: string; name: string; changeRate: number | null }>;
}

/** 종목 오늘 소식 — 최신이 앞 · 광고성 제외는 서버. `collectedAt` 은 시장 전체 마지막 수집(신선도) */
export interface KrStockNews {
  code: string;
  /** 오늘(KST, YYYY-MM-DD) */
  date: string;
  collectedAt: string | null;
  items: KrNewsItem[];
}

/** 장중 프로그램 매매 누적(체결) — 금액 원 정수 · 수량 주(문자열). 서버 값 그대로 */
export interface KrProgramFlow {
  at: string;
  netQuantity: string;
  netValue: number;
  buyValue: number;
  sellValue: number;
  collectedAt: string;
}

/** 종목 장중 수급(`BFF-REQ-051` FR-4) — 오늘 값이 없으면 `program: null`(0 으로 그리지 않는다) */
export interface KrIntradayFlows {
  code: string;
  date: string;
  program: KrProgramFlow | null;
}

export const KR_STOCK_CODE_PATTERN = /^[0-9A-Z]{6}$/;

/**
 * 라우트 심볼이 국내 주식 코드인가 — **숫자로 시작하는 6자리**(F011 OQ "숫자 6자리 = 국내주식").
 * 서버 규칙(`[0-9A-Z]{6}`)만 쓰면 6글자 코인 티커가 국내 주식으로 간다. 신규 코드(`0126Z0`)도 숫자로 시작한다
 */
export const isKrStockCode = (symbol: string): boolean =>
  /^[0-9]/.test(symbol) && KR_STOCK_CODE_PATTERN.test(symbol.toUpperCase());

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → KST `HH:mm` */
export const kstClock = (iso: string): string => {
  const d = new Date(Date.parse(iso) + KST_OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/** ISO → KST `HH:mm:ss` — 마지막 체결 · VI 발동처럼 초가 뜻을 갖는 시각(F016 단계 A) */
export const kstClockSeconds = (iso: string): string => {
  const d = new Date(Date.parse(iso) + KST_OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

/** ISO → KST 요일(0 = 일) */
export const kstWeekday = (iso: string): number => new Date(Date.parse(iso) + KST_OFFSET_MS).getUTCDay();

/** ISO → KST `M/D` */
export const kstMonthDay = (iso: string): string => {
  const d = new Date(Date.parse(iso) + KST_OFFSET_MS);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

/** 두 시각의 KST 달력 날짜 차(`to` − `from`). 같은 날 0 · 다음 날 1 */
export const kstDayDiff = (fromIso: string, toIso: string): number => {
  const day = (iso: string) => Math.floor((Date.parse(iso) + KST_OFFSET_MS) / DAY_MS);
  return day(toIso) - day(fromIso);
};

/** 정규장(동시호가 포함) — 체결이 흐르는 시간. 그 밖은 표 머리가 "정규장 아님" 줄을 보인다(FR-41) */
export const isKrRegularSession = (session: KrSession): boolean =>
  session === "regular" || session === "closing_auction";

/**
 * 시세가 몇 분 전 값인가 — `feed = stale` 일 때만 쓴다(FR-45). 폐장 뒤 마지막 체결은 정상 값이라 서버가 `stale` 로 주지 않는다.
 * 1분 미만은 1분으로 올린다("0분 전"은 지연이 아닌 것처럼 읽힌다)
 */
export const krStaleMinutes = (priceUpdatedAt: string, nowIso: string): number =>
  Math.max(1, Math.floor((Date.parse(nowIso) - Date.parse(priceUpdatedAt)) / 60_000));

/** 호가 한 단계 — 가격은 원 정수, 잔량은 주(BigInt 문자열) */
export interface KrOrderbookLevel {
  price: number;
  quantity: string;
}

/**
 * 호가 10단계(F011 슬라이스 6b · `BFF-REQ-040` FR-29) — 매도 · 매수 모두 1단계(최우선)부터. 서버가 요청 시점에 받고 10초 캐시한다.
 * `available: false` 면 한 번도 못 받았다 · `stale` 이면 받아 둔 값이다
 */
export interface KrOrderbook {
  code: string;
  available: boolean;
  asks: KrOrderbookLevel[];
  bids: KrOrderbookLevel[];
  totalAskQuantity: string | null;
  totalBidQuantity: string | null;
  /** KIS 호가 접수 시각 */
  at: string | null;
  fetchedAt: string | null;
  stale: boolean;
}
