import { DomainError, ErrorKind } from "../../shared/domain";
import type { Candle } from "./ports";

/**
 * 국내 주식(F011 · `SRV-REQ-040`) — 한국투자증권(KIS) Open API 로 **시세만** 받는다.
 *
 * 주문 · 계좌 · 잔고 · 체결통보는 이 컨텍스트에 Port 자체가 없다(공통 수용 기준 2). 아래 Port 는
 * 전부 조회이고, 구현(`KisClient`)은 조회 TR 허용 목록 밖을 부를 수 없다.
 *
 * 시세는 `MarketAsset` 이 아니라 `kr_stock_quotes` 에 둔다 — `MarketAsset` 을 읽는 코인 경로
 * (상폐 처리 · 1분 시세 · 시장표 · 등락 집계)가 자산군을 거르지 않는다.
 */

export type KrMarket = "KOSPI" | "KOSDAQ";

/** 종목 마스터 한 줄(KIS `.mst`). 금액은 원, 주식 수는 주 */
export interface KrStockListing {
  code: string;
  standardCode: string;
  name: string;
  market: KrMarket;
  /** ST 주권 · EF ETF · EN ETN · RT 리츠 … — 유니버스 시총 상위는 ST 만 */
  groupCode: string;
  sectorCode: string | null;
  basePrice: number | null;
  sharesOutstanding: bigint | null;
  /** 전일 시가총액(원) */
  marketCap: number | null;
  isHalted: boolean;
  isAdministrative: boolean;
  warnCode: string;
  overheatCode: string;
  isPreferred: boolean;
  listedAt: Date | null;
}

/** 현재가 조회 한 건 — KIS 필드 이름은 `KisClient` 에서 끝난다 */
export interface KrStockQuoteFact {
  code: string;
  price: number;
  change: number;
  changeRate: number;
  volume: bigint;
  tradeValue: number;
  /** 원(KIS 는 억 단위로 준다 — 어댑터가 바꾼다) */
  marketCap: number | null;
  basePrice: number | null;
  upperLimit: number | null;
  lowerLimit: number | null;
  statusCode: string | null;
  warnCode: string | null;
  isHalted: boolean;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  week52High: number | null;
  week52Low: number | null;
  foreignRate: number | null;
  /** 당일 시가 · 고가 · 저가(원) — 코인 표의 최고가 · 최저가 열과 같은 자리(F011 슬라이스 3). 장 전 · 휴장일은 KIS 가 전일 값 또는 0 을 준다 → 0 은 `null` */
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
}

export type KrQuoteFeed = "poll_1m" | "realtime";

export interface StoredKrStockQuote extends KrStockQuoteFact {
  name: string;
  market: KrMarket;
  feed: KrQuoteFeed;
  priceUpdatedAt: Date;
}

/** 개장일 달력 하루(KIS 휴장일 조회 원문 플래그) */
export interface KrMarketDay {
  /** KST 날짜 `YYYY-MM-DD` */
  date: string;
  isOpen: boolean;
  isTradingDay: boolean;
  isBusinessDay: boolean;
  isSettlementDay: boolean;
}

// ==================== Port ====================

/** KIS 조회. **트랜잭션 밖에서 부른다** — 페이서 대기와 네트워크가 수 초 걸린다 */
export interface KrStockQuotePort {
  quote(code: string): Promise<KrStockQuoteFact>;
  /** 수정주가 일봉 `[from, to]`(KST 날짜), 한 번에 최대 100건. 봉 시각은 거래일 00:00 KST */
  dailyCandles(code: string, from: string, to: string): Promise<Candle[]>;
  /** 그날(KST) `hhmmss` 이전 1분봉 최대 120개(최신이 앞) */
  dayMinuteCandles(code: string, date: string, hhmmss: string): Promise<Candle[]>;
  /** `baseDate`(KST) 부터 앞으로의 달력 한 페이지 */
  marketDays(baseDate: string): Promise<KrMarketDay[]>;
}

export interface KrStockMasterSource {
  /** KOSPI + KOSDAQ 전 종목. 둘 중 하나라도 실패하면 던진다 — 반쪽 마스터로 상폐 처리하지 않는다 */
  listings(): Promise<KrStockListing[]>;
}

export interface KrStockStore {
  upsertListings(listings: KrStockListing[], syncedAt: Date): Promise<void>;
  /** 마스터에서 사라진 종목 — 지우지 않고 `delistedAt`(원장이 참조할 수 있다) */
  markDelistedExcept(codes: string[], at: Date): Promise<number>;
  /** 주권(ST) 시총 상위 n — 상폐 · 우선주 제외 */
  topByMarketCap(n: number): Promise<string[]>;
  /** 누군가의 관심 목록에 있는 국내 주식 코드(사용자 구분 없음) */
  watchedCodes(): Promise<string[]>;
  /** 한 회차의 현재가를 한 문장으로. 빈 배열이면 아무것도 안 한다 */
  upsertQuotes(facts: KrStockQuoteFact[], feed: KrQuoteFeed, at: Date): Promise<void>;
  quotes(query: { codes?: string[]; limit: number; offset: number }): Promise<StoredKrStockQuote[]>;
  quote(code: string): Promise<StoredKrStockQuote | null>;
  search(q: string, limit: number): Promise<Array<Pick<KrStockListing, "code" | "name" | "market">>>;
  /** 종목별 마지막 일봉 시각. 백필이 어디서 이을지 정한다 */
  latestDailyCandleAt(codes: string[]): Promise<Map<string, Date>>;
  upsertDailyCandles(code: string, candles: Candle[]): Promise<void>;
  candles(code: string, timeframe: "1d" | "5m", count: number): Promise<Candle[]>;
  /** 마스터 한 줄(상폐 제외) — 관심 종목 추가가 이름을 여기서 가져온다 */
  findListing(code: string): Promise<Pick<KrStockListing, "code" | "name" | "market"> | null>;
  /**
   * 종목별 기준 종가 — 그 종목 시세 날짜(KST) **이전** 일봉 중 `tradingDaysBack` 번째(1 = 직전 거래일) 종가.
   * 봉이 모자라면 그 종목은 빠진다(기간 변동률 `null`)
   */
  baselineCloses(codes: string[], tradingDaysBack: number): Promise<Map<string, number>>;
  /** 실시간 체결의 최신 값만 — 상하한 · PER 같은 나머지는 폴링 값을 남긴다(슬라이스 1) */
  applyTicks(ticks: KrTick[], at: Date): Promise<void>;
  /** 5분봉 upsert(종목 여럿 한 문장) */
  upsertMinuteCandles(bars: Array<{ code: string; candle: Candle }>): Promise<void>;
  /** 실시간 값이 `since` 이후인 종목 — 폴링이 건너뛴다 */
  realtimeFreshCodes(since: Date): Promise<string[]>;
  /** 종목 · KST 날짜별 5분봉 수와 15:25 버킷(종가 들어가는 봉) 유무 — 보정 · 백필이 빈 날을 고른다 */
  minuteBarCoverage(codes: string[], from: string): Promise<Map<string, Map<string, { count: number; hasClose: boolean }>>>;
  /** KIS 분봉에서 만든 5분봉으로 **덮어쓴다**(실시간 집계보다 원천이 정확하다) */
  replaceMinuteCandles(code: string, candles: Candle[]): Promise<void>;
}

/**
 * 달력 출처. `kis` 휴장일 조회가 1순위인데, 2026-10-07 실측에서 이 앱 키로는 `EGW02004`(실전 도메인 · 모의
 * 앱 키)로 거부됐다 — 현재가 · 일봉은 같은 키로 된다. 그래서 둘을 더 둔다: `candles` = 저장된 일봉으로 지난
 * 개장일 역산(평일인데 어느 종목에도 봉이 없으면 휴장) · `probe` = 오늘 09:10 이후 당일 봉 유무
 */
export type KrCalendarSource = "kis" | "candles" | "probe";

export interface KrMarketCalendarStore {
  upsertDays(days: KrMarketDay[], at: Date, source: KrCalendarSource): Promise<void>;
  /** `[from, to]` 평일 중 국내 주식 일봉이 하나라도 있는 날 = 개장. 마지막 저장 봉 날짜 뒤는 내지 않는다 */
  daysFromDailyCandles(from: string, to: string): Promise<KrMarketDay[]>;
  /** `[from, to]` KST 날짜 */
  days(from: string, to: string): Promise<KrMarketDay[]>;
}

// ==================== 오류 ====================

/** 키가 없어 기능이 꺼져 있다(FR-6) — 503 */
export class KrStockDisabledError extends DomainError {
  constructor() {
    super("KR_STOCK_DISABLED", ErrorKind.Unavailable, "kr_stock_disabled");
  }
}

/**
 * 국내 주식 시세를 볼 수 없다 — 소유자가 아니거나 없는 종목. **둘을 구분하지 않는다**: 비소유자에게
 * 국내 주식이 있다는 사실 자체를 주지 않는다(재배포 약관 확인 전 소유자 전용, F011 §정책)
 */
export class KrStockNotAvailableError extends DomainError {
  constructor() {
    super("KR_STOCK_NOT_AVAILABLE", ErrorKind.NotFound, "Kr stock not available");
  }
}

export const isKrStockViewer = (email: string | undefined, owners: readonly string[]): boolean =>
  !!email && owners.some((owner) => owner.trim().toLowerCase() === email.trim().toLowerCase());

// ==================== 장 상태 (FR-26) ====================

export type KrSession =
  | "pre_open"
  | "regular"
  | "closing_auction"
  | "after_hours_close"
  | "after_hours_single"
  | "closed"
  | "holiday";

export interface KrSessionView {
  session: KrSession;
  /** 마지막 정규장 마감(15:30 KST) — 정규장 중이면 `null` */
  lastCloseAt: Date | null;
  /** 다음 정규장 시작(09:00 KST) — 정규장 중이면 `null` */
  nextOpenAt: Date | null;
  /**
   * 오늘 날짜가 달력에 없으면 `false` — 평일 = 개장으로 **추정**했다는 뜻이다. 휴장일 조회가 아직
   * 안 돌았거나 실패한 경우이고, 화면이 그 사실을 숨기지 않게 응답에 싣는다
   */
  calendarKnown: boolean;
}

const KST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;

/** 장 시간(KST 분) — KRX 정규장 기준. 근거 등급 [약](F011 §KIS 사실) — 슬라이스 1 전 원문 확인 */
const MIN = (h: number, m: number) => h * 60 + m;
const SESSION_BOUNDS: Array<{ from: number; to: number; session: KrSession }> = [
  { from: MIN(8, 30), to: MIN(9, 0), session: "pre_open" },
  { from: MIN(9, 0), to: MIN(15, 20), session: "regular" },
  { from: MIN(15, 20), to: MIN(15, 30), session: "closing_auction" },
  { from: MIN(15, 40), to: MIN(16, 0), session: "after_hours_close" },
  { from: MIN(16, 0), to: MIN(18, 0), session: "after_hours_single" },
];

/** UTC 시각 → KST 날짜 문자열 */
export const kstDateOf = (at: Date): string =>
  new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

/** KST 날짜의 `HH:mm` → UTC 시각 */
export const kstAt = (date: string, hour: number, minute = 0): Date =>
  new Date(Date.parse(`${date}T00:00:00Z`) - KST_OFFSET_MS + (hour * 60 + minute) * 60_000);

export const addKstDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const isWeekend = (date: string) => {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
};

/**
 * 그 날 장이 열리나. 달력에 있으면 달력이 진실이고, 없으면 평일 = 개장으로 추정한다.
 * 추정은 `calendarKnown = false` 로 드러난다(위)
 */
const opensOn = (date: string, calendar: ReadonlyMap<string, boolean>): boolean =>
  calendar.get(date) ?? !isWeekend(date);

/** 달력이 다 비어도 무한 루프를 돌지 않는 상한 — 연휴 최장(추석 + 주말)보다 넉넉히 */
const MAX_SCAN_DAYS = 20;

export const krMarketSession = (
  now: Date,
  calendar: ReadonlyMap<string, boolean>
): KrSessionView => {
  const today = kstDateOf(now);
  const minutes = Math.floor(((now.getTime() + KST_OFFSET_MS) % DAY_MS) / 60_000);
  const openToday = opensOn(today, calendar);

  const prevOpenDay = (from: string): string => {
    let d = from;
    for (let i = 0; i < MAX_SCAN_DAYS; i++) {
      d = addKstDays(d, -1);
      if (opensOn(d, calendar)) return d;
    }
    return d;
  };
  const nextOpenDay = (from: string): string => {
    let d = from;
    for (let i = 0; i < MAX_SCAN_DAYS; i++) {
      d = addKstDays(d, 1);
      if (opensOn(d, calendar)) return d;
    }
    return d;
  };

  const calendarKnown = calendar.has(today);

  if (!openToday) {
    return {
      // 주말은 휴장일이 아니다 — 화면이 "휴장" 이 아니라 "정규장 아님" 으로 읽게
      session: isWeekend(today) ? "closed" : "holiday",
      lastCloseAt: kstAt(prevOpenDay(today), 15, 30),
      nextOpenAt: kstAt(nextOpenDay(today), 9, 0),
      calendarKnown,
    };
  }

  const bound = SESSION_BOUNDS.find((b) => minutes >= b.from && minutes < b.to);
  const session = bound?.session ?? "closed";
  const inRegular = session === "regular" || session === "closing_auction";
  const beforeOpen = minutes < MIN(9, 0);

  return {
    session,
    lastCloseAt: inRegular ? null : kstAt(beforeOpen ? prevOpenDay(today) : today, 15, 30),
    nextOpenAt: inRegular ? null : kstAt(beforeOpen ? today : nextOpenDay(today), 9, 0),
    calendarKnown,
  };
};

/**
 * 시세를 받을 시간대인가 — 장전 동시호가 ~ 장후 시간외 종가(08:30~16:00).
 *
 * **시간외 단일가(16:00~18:00)는 뺀다.** 그 시간 실시간 체결(`H0STCNT0`)과 현재가 조회가 시간외 체결값을 준다
 * (2026-10-07 실측: 삼성전자 15:30 종가 체결 268,500 · 16:3x 현재가 조회 270,500 · 16:2x 당일 일봉 270,000 —
 * 지난 날은 일봉 = 15:30 체결). 받으면 정규장 종가 · 등락률이 시간외 값으로 덮인다(FR-27 은 섞지 않는다 — 시간외는
 * 별도 필드, 슬라이스 6). 기획 FR-25 의 18:00 은 그 슬라이스에서 별도 필드와 함께 연다
 */
export const isKrQuoteWindow = (view: KrSessionView): boolean =>
  view.session === "pre_open" ||
  view.session === "regular" ||
  view.session === "closing_auction" ||
  view.session === "after_hours_close";

// ==================== 호가 단위 (FR-42) ====================

/**
 * 호가 단위(원) — 2023-01-25 개편 KRX 규정. 근거 등급 [약](F011 §KIS 사실), 화면 안내용이고 입력을
 * 막지 않는다(수동 입력 원칙). 금액 판단이라 서버가 정한다(§6-3)
 */
const TICK_TABLE: Array<{ below: number; tick: number }> = [
  { below: 2_000, tick: 1 },
  { below: 5_000, tick: 5 },
  { below: 20_000, tick: 10 },
  { below: 50_000, tick: 50 },
  { below: 200_000, tick: 100 },
  { below: 500_000, tick: 500 },
];

export const krTickSize = (price: number): number =>
  TICK_TABLE.find((row) => price < row.below)?.tick ?? 1_000;

/** 6자리 숫자 코드(우선주 · 신주인수권 일부는 영문 섞임 — 마스터가 주는 그대로 받는다) */
export const isKrStockCode = (value: string): boolean => /^[0-9A-Z]{6}$/.test(value);

// ==================== 표시 판정 (FR-43 · 44 · 45) — 프론트는 그리기만 한다 ====================

export type KrStatusBadge = "halted" | "administrative" | "caution" | "warning" | "danger" | "overheat";

/**
 * 종목 상태 배지. `iscd_stat_cls_code`(51 관리 · 52 투자위험 · 53 투자경고 · 54 투자주의 · 58 거래정지 ·
 * 59 단기과열) 와 `mrkt_warn_cls_code`(01 주의 · 02 경고 · 03 위험) 를 합친다 — 코드 의미 근거 등급 [약]
 */
export const krStatusBadges = (q: Pick<KrStockQuoteFact, "statusCode" | "warnCode" | "isHalted">): KrStatusBadge[] => {
  const badges = new Set<KrStatusBadge>();
  if (q.isHalted || q.statusCode === "58") badges.add("halted");
  if (q.statusCode === "51") badges.add("administrative");
  if (q.statusCode === "52" || q.warnCode === "03") badges.add("danger");
  if (q.statusCode === "53" || q.warnCode === "02") badges.add("warning");
  if (q.statusCode === "54" || q.warnCode === "01") badges.add("caution");
  if (q.statusCode === "59") badges.add("overheat");
  return [...badges];
};

/** 상한가 · 하한가 도달 — 값이 없으면 판단하지 않는다 */
export const krLimitState = (
  q: Pick<KrStockQuoteFact, "price" | "upperLimit" | "lowerLimit">
): "upper" | "lower" | null => {
  if (q.upperLimit !== null && q.upperLimit > 0 && q.price >= q.upperLimit) return "upper";
  if (q.lowerLimit !== null && q.lowerLimit > 0 && q.price <= q.lowerLimit) return "lower";
  return null;
};

/** 시세를 받는 시간대에 이보다 오래된 값은 지연이다 — 1분 폴링 두 번을 놓친 셈 */
export const KR_QUOTE_STALE_MS = 3 * 60_000;

export type KrFeedState = KrQuoteFeed | "stale";

export const krFeedState = (
  q: Pick<StoredKrStockQuote, "feed" | "priceUpdatedAt">,
  now: Date,
  session: KrSessionView
): KrFeedState =>
  isKrQuoteWindow(session) && now.getTime() - q.priceUpdatedAt.getTime() > KR_QUOTE_STALE_MS ? "stale" : q.feed;

// ==================== 시세 표 정렬 · 기간 변동률 (F011 슬라이스 3 — 코인 표와 같은 필터) ====================

/**
 * 정렬 · 기간 값은 **코인 시세 표와 같은 문자열**이다(`MarketOverviewSort` · `MarketOverviewPeriod`) — 화면이 같은 필터를
 * 그대로 보낸다. 코인과 다른 것 하나: 기본(`all`)이 거래대금이 아니라 **시가총액** 순이다(국내 주식 표의 원래 순서)
 */
export type KrListSort = "all" | "trade_value" | "change" | "price" | "name";
export type KrListPeriod = "realtime" | "1d" | "7d" | "1m" | "3m" | "6m" | "1y";

/** 기간 → 몇 거래일 전 종가와 비교하는가. 코인은 달력 일수(24시간 열림), 주식은 거래일이라 셈이 다르다 */
export const KR_PERIOD_TRADING_DAYS: Record<Exclude<KrListPeriod, "realtime">, number> = {
  "1d": 1,
  "7d": 5,
  "1m": 21,
  "3m": 63,
  "6m": 126,
  "1y": 250,
};

/** 기준 종가 대비 변동률(%). 기준이 없으면 `null` — 전일 대비로 대신 채우지 않는다(코인 `periodChange` 와 같은 규칙) */
export const krPeriodChange = (price: number, baseClose: number | undefined): number | null =>
  baseClose === undefined || !(baseClose > 0) || !(price > 0) ? null : ((price - baseClose) / baseClose) * 100;

type KrRankable = Pick<StoredKrStockQuote, "code" | "name" | "price" | "changeRate" | "tradeValue" | "marketCap"> & {
  periodChange: number | null;
};

/**
 * 정렬. 값이 없는 종목(시총 · 기간 변동률 `null`)은 방향과 무관하게 뒤로 — 오름차순 첫 화면이 "—" 로 채워지지 않게.
 * 같은 값은 시가총액 순(국내 표 기본), 그다음 코드 — 순서가 매번 같아야 페이지가 겹치지 않는다
 */
export const rankKrQuotes = <T extends KrRankable>(items: T[], sort: KrListSort, order: "asc" | "desc"): T[] => {
  const sign = order === "asc" ? 1 : -1;
  const key = (q: T): number | string | null => {
    switch (sort) {
      case "all":
        return q.marketCap;
      case "trade_value":
        return q.tradeValue;
      case "change":
        return q.periodChange;
      case "price":
        return q.price;
      case "name":
        return q.name;
    }
  };
  const tie = (a: T, b: T) => (b.marketCap ?? -1) - (a.marketCap ?? -1) || a.code.localeCompare(b.code);
  return [...items].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null || kb === null) return ka === kb ? tie(a, b) : ka === null ? 1 : -1;
    const cmp = typeof ka === "string" ? ka.localeCompare(kb as string, "ko") : ka - (kb as number);
    return cmp !== 0 ? sign * cmp : tie(a, b);
  });
};

// ==================== 실시간 (F011 슬라이스 1 · FR-24 · 25) ====================

/** 체결 한 건(`H0STCNT0`) — KIS 필드 이름은 `KisRealtimeClient` 에서 끝난다 */
export interface KrTick {
  code: string;
  price: number;
  change: number;
  changeRate: number;
  /** 이 체결의 수량 — 5분봉 거래량은 이것의 합 */
  tradeVolume: number;
  accVolume: bigint;
  accTradeValue: number;
  isHalted: boolean;
  /** 당일 시가 · 고가 · 저가 — 체결 프레임이 같이 준다(`STCK_OPRC` · `STCK_HGPR` · `STCK_LWPR`). 0 · 형식 오류는 `null` */
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  /** 체결 시각(KST 영업일 + HHMMSS → UTC) */
  at: Date;
}

export type KrRealtimeState = "idle" | "connecting" | "open" | "backoff" | "degraded";

/**
 * WS 실시간 체결. 세션은 앱 키당 하나(근거 [약]) — 이 Port 의 구현은 프로세스에 하나다.
 * `subscribe` 는 **원하는 전체 집합**을 받는다: 빠진 것은 해제하고 새것만 등록한다
 */
export interface KrRealtimePort {
  connect(onTick: (ticks: KrTick[]) => void): Promise<void>;
  subscribe(codes: string[]): Promise<void>;
  disconnect(): Promise<void>;
  state(): KrRealtimeState;
  subscribed(): string[];
}

/** 세션당 등록 상한 — 체결 + 호가 합산 41(근거 [약], 이번 슬라이스 실측 대상). 호가는 아직 안 쓴다 */
export const KR_REALTIME_SLOTS = 41;

const FIVE_MINUTES_MS = 5 * 60_000;

/**
 * 정규장 5분 버킷 시작(UTC ms) — 밖이면 `null`.
 *
 * **15:30 은 15:25 버킷에 넣는다.** 15:20~15:30 은 장 마감 동시호가라 체결이 없고, 15:30 에 종가 단일가 체결이 한 번
 * 찍힌다(2026-10-07 실측: 10/6 삼성전자 15:30 1분봉 거래량 142만 · 종가 272,000 = 일봉 종가). 그것을 버리면 그날
 * 마지막 5분봉의 종가가 일봉 종가와 달라진다 — 첫 판이 그랬다
 */
export const krFiveMinuteBucket = (at: Date): number | null => {
  const kstMinutes = Math.floor(((at.getTime() + KST_OFFSET_MS) % DAY_MS) / 60_000);
  if (kstMinutes < MIN(9, 0) || kstMinutes > MIN(15, 30)) return null;
  const minutes = kstMinutes === MIN(15, 30) ? MIN(15, 25) : kstMinutes;
  const dayStart = at.getTime() - (((at.getTime() + KST_OFFSET_MS) % DAY_MS));
  return dayStart + Math.floor(minutes / 5) * 5 * 60_000;
};

/** 1분봉 → 5분봉(장 마감 보정 · 백필). 시각 오름차순으로 낸다 */
export const krMinutesToFiveMinute = (minutes: Candle[]): Candle[] => {
  const buckets = new Map<number, Candle>();
  for (const m of [...minutes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
    const start = krFiveMinuteBucket(m.timestamp);
    if (start === null) continue;
    const bar = buckets.get(start);
    if (!bar) {
      buckets.set(start, { ...m, timestamp: new Date(start) });
    } else {
      bar.high = Math.max(bar.high, m.high);
      bar.low = Math.min(bar.low, m.low);
      bar.close = m.close;
      bar.volume = (bar.volume ?? 0) + (m.volume ?? 0);
    }
  }
  return [...buckets.values()];
};

/** 정규장 5분 버킷 수 — 09:00~15:25(15:20 은 동시호가라 비고 15:25 에 종가가 들어간다) */
export const KR_FIVE_MINUTE_BUCKETS_PER_DAY = 78;

/**
 * 체결 → 5분봉 집계(FR-21). KIS 분봉 TR 은 당일 · 30건뿐이라 우리가 쌓는다.
 *
 * 봉 시각은 버킷 **시작**(UTC 저장, 경계는 5분이라 KST 와 같다). 같은 버킷에 늦게 온 체결도 그 버킷에 더한다
 * — 순서가 섞여 와도 시가는 가장 이른 체결, 종가는 가장 늦은 체결이다. 정규장 밖 체결은 받지 않는다
 * (시간외는 지표에 넣지 않는다 — FR-60)
 */
export class KrMinuteBarBuilder {
  private readonly bars = new Map<string, Candle & { firstAt: number; lastAt: number }>();
  private readonly touched = new Set<string>();

  add(tick: KrTick) {
    const start = krFiveMinuteBucket(tick.at);
    if (start === null) return;
    const key = `${tick.code}|${start}`;
    const t = tick.at.getTime();
    const bar = this.bars.get(key);
    if (!bar) {
      this.bars.set(key, {
        open: tick.price, high: tick.price, low: tick.price, close: tick.price,
        volume: tick.tradeVolume, timestamp: new Date(start), firstAt: t, lastAt: t,
      });
    } else {
      bar.high = Math.max(bar.high, tick.price);
      bar.low = Math.min(bar.low, tick.price);
      bar.volume = (bar.volume ?? 0) + tick.tradeVolume;
      if (t < bar.firstAt) { bar.open = tick.price; bar.firstAt = t; }
      if (t >= bar.lastAt) { bar.close = tick.price; bar.lastAt = t; }
    }
    this.touched.add(key);
  }

  /**
   * 지난 저장 뒤 바뀐 봉(진행 중 포함)을 내고, `now` 기준 10분 넘게 지난 봉은 메모리에서 버린다 —
   * 진행 중 봉을 매번 덮어 써서 차트가 장중에도 끝 봉을 본다
   */
  drain(now: Date): Array<{ code: string; candle: Candle }> {
    const out = [...this.touched].map((key) => {
      const bar = this.bars.get(key)!;
      const { firstAt: _f, lastAt: _l, ...candle } = bar;
      return { code: key.split("|")[0], candle };
    });
    this.touched.clear();
    for (const [key, bar] of this.bars) {
      if (now.getTime() - bar.timestamp.getTime() > 2 * FIVE_MINUTES_MS) this.bars.delete(key);
    }
    return out;
  }
}

// ==================== 제공자 상태 · 지표 (FR-92 · 94) ====================

export type KrProviderStatus = "ok" | "degraded";

/** KIS REST 건강 상태 — 호출 결과에서 센다(따로 핑하지 않는다) */
export interface KrProviderSnapshot {
  status: KrProviderStatus;
  /** 지금 상태가 시작된 시각 */
  since: Date | null;
  lastSuccessAt: Date | null;
  consecutiveFailures: number;
}

export interface KrProviderHealthPort {
  snapshot(): KrProviderSnapshot;
  /** 지난 호출 이후 TR 별 호출 · 실패 · 초과 수와 오늘 토큰 발급 수를 내고 비운다(관측 로그용) */
  drainMetrics(): {
    byTr: Record<string, { calls: number; failures: number; rateLimited: number }>;
    tokensIssuedToday: number;
  };
}

/** 연속 실패가 이만큼이면 degraded(FR-90 서킷과 같은 수) */
export const KR_PROVIDER_DEGRADED_AFTER = 5;
/** 토큰 발급이 하루 이만큼을 넘으면 캐시가 깨진 것이다(FR-94) */
export const KR_TOKEN_ISSUE_WARN_PER_DAY = 3;

/**
 * 종목 로고 주소(F011 FR-47) — KIS 는 로고를 주지 않는다. 2026-10-08 조사(체크리스트 `FE-REQ-041`):
 *
 * 1. **logo.dev** — 사용 조건이 가장 분명하다(저장 허용 · 개인 프로젝트 출처 표기 불필요). 퍼블리셔블 키(`pk_`)라 브라우저에 실려도
 *    된다. 키(`KR_LOGO_DEV_TOKEN`)가 있을 때만
 * 2. **FMP image-stock** — 키가 없다. 실측 15/15(KOSPI · KOSDAQ). 재배포 조건이 불명확해 소유자 전용(지금)에서만 쓴다
 * 3. 그 밖 — 주소 없음이 아니라 둘 다 **없는 로고는 404** 를 준다(`fallback=404`). 화면이 이니셜로 넘어간다
 *
 * 국내 증권 · 포털 앱의 이미지 서버는 쓰지 않는다(허락 없는 자산). 주소는 서버가 정한다 — 화면이 규칙을 갖지 않는다
 */
export const krStockLogoUrl = (code: string, market: KrMarket, logoDevToken?: string): string => {
  const suffix = market === "KOSDAQ" ? "KQ" : "KS";
  return logoDevToken
    ? `https://img.logo.dev/ticker/${code}.${suffix}?token=${encodeURIComponent(logoDevToken)}&size=64&format=png&fallback=404`
    : `https://financialmodelingprep.com/image-stock/${code}.${suffix}.png`;
};
