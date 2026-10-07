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

/** 시세를 1분마다 받을 시간대인가 — 장전 동시호가 ~ 시간외 단일가(FR-25 와 같은 창) */
export const isKrQuoteWindow = (view: KrSessionView): boolean =>
  view.session !== "closed" && view.session !== "holiday";

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
