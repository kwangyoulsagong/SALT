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

export type KrStatusBadge = "halted" | "administrative" | "caution" | "warning" | "danger" | "overheat";

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
  feed: KrFeed;
  priceUpdatedAt: string;
  /** 당일 시가 · 고가 · 저가 — KIS 현재가 응답(`FE-REQ-041` 계약 확장). 아직 받지 못한 행은 `null` */
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  /** 기간 수익률(%) — `period` 를 줬을 때만, 일봉 이력이 없으면 `null`. 서버 계산 */
  periodChange?: number | null;
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
