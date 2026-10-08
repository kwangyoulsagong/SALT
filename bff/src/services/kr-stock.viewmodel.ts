/**
 * 국내 주식 뷰모델 — **순수 함수** (F011 슬라이스 2 · `BFF-REQ-040`).
 *
 * 서버 `GET /api/market/kr/*` 가 이미 다 계산한다(원 정수 반올림 · 상하한 도달 · 상태 배지 · 시세 지연 · 호가 단위).
 * BFF 가 하는 일:
 *
 * 1. **필드를 골라 옮긴다.** 서버가 필드를 늘려도 화면 계약이 저절로 늘지 않는다(`rest-contract.md` raw 노출 금지)
 * 2. **계약이 깨지면 던진다**(`KrContractError`) — 서비스가 `unavailable` 로 바꾼다. 빈 값 · 0 으로 채우지 않는다.
 *    0원은 "가격이 0원"으로 읽힌다(`bff-architecture.md` §5)
 * 3. **열거값은 아는 것만** 옮긴다. 상태 배지는 모르는 값을 버린다(화면에 문구가 없다). 장 상태 · 시세 상태는
 *    모르면 계약 깨짐 — 화면 분기가 그 값에 걸려 있다
 *
 * 하지 않는 것: 금액 · 등락 · 호가 단위 · 상하한 판정(공통 수용 기준 3), 장 상태 판정, 문구.
 */

export const KR_SESSIONS = [
  "pre_open",
  "regular",
  "closing_auction",
  "after_hours_close",
  "after_hours_single",
  "closed",
  "holiday",
] as const;
export type KrSession = (typeof KR_SESSIONS)[number];

export const KR_STATUS_BADGES = ["halted", "administrative", "caution", "warning", "danger", "overheat"] as const;
export type KrStatusBadge = (typeof KR_STATUS_BADGES)[number];

export const KR_FEEDS = ["realtime", "poll_1m", "stale"] as const;
export type KrFeed = (typeof KR_FEEDS)[number];

const KR_MARKETS = ["KOSPI", "KOSDAQ"] as const;
export type KrMarket = (typeof KR_MARKETS)[number];

const KR_REALTIME_STATES = ["idle", "connecting", "open", "backoff", "degraded"] as const;
export type KrRealtimeState = (typeof KR_REALTIME_STATES)[number];

export type KrChartPeriod = "1d" | "5m";

/**
 * 시세 표 필터 — **코인 시세 표와 같은 문자열**(화면이 같은 필터를 보낸다). 빈 문자열 = 기본(정렬 시가총액 · 기간 실시간).
 * 서버 DTO(`krListQuerySchema`)와 같은 집합이다 — 모르는 값은 400
 */
export const KR_LIST_SORTS = ["", "all", "trade_value", "change", "price", "name"] as const;
export const KR_LIST_ORDERS = ["", "asc", "desc"] as const;
export const KR_LIST_PERIODS = ["", "realtime", "1d", "7d", "1m", "3m", "6m", "1y"] as const;
export type KrListSort = (typeof KR_LIST_SORTS)[number];
export type KrListOrder = (typeof KR_LIST_ORDERS)[number];
export type KrListPeriod = (typeof KR_LIST_PERIODS)[number];

/** 시세 표 한 줄 — 시세 + 선택한 기간의 변동률(%). 실시간이면 전일 대비와 같고, 기준 일봉이 없으면 `null` */
export interface KrOverviewItemVM extends KrQuoteVM {
  periodChange: number | null;
}

export interface KrSessionVM {
  session: KrSession;
  now: string;
  /** 마지막 정규장 마감(15:30 KST) — 정규장 중이면 `null` */
  lastCloseAt: string | null;
  /** 다음 정규장 시작(09:00 KST) — 정규장 중이면 `null` */
  nextOpenAt: string | null;
  /** `false` 면 오늘이 개장일 달력에 없어 평일 = 개장으로 **추정**했다. 화면이 숨기지 않는다 */
  calendarKnown: boolean;
}

export interface KrProviderVM {
  /** `degraded` 면 표 머리 "시세 제공 지연 중 · {since}"(F011 UX Stale) */
  status: "ok" | "degraded";
  since: string | null;
  lastSuccessAt: string | null;
  /** 슬롯 수는 운영 정보라 옮기지 않는다 — 화면은 연결 상태와 마지막 체결만 쓴다 */
  realtime: { state: KrRealtimeState; lastTickAt: string | null };
}

export interface KrQuoteVM {
  code: string;
  name: string;
  market: KrMarket;
  price: number;
  change: number;
  changeRate: number;
  /** 누적 거래량 — 서버가 BigInt 를 문자열로 준다. 숫자로 바꾸지 않는다 */
  volume: string;
  tradeValue: number;
  marketCap: number | null;
  basePrice: number | null;
  upperLimit: number | null;
  lowerLimit: number | null;
  /** 당일 시가 · 고가 · 저가(원) — 코인 표의 최고가 · 최저가 열(F011 슬라이스 3). 장 전엔 `null` */
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  limitState: "upper" | "lower" | null;
  status: KrStatusBadge[];
  isHalted: boolean;
  feed: KrFeed;
  priceUpdatedAt: string;
  /**
   * 로고 주소 — 서버가 종목마다 판정한 logo.dev 주소. 키가 없거나 선명한 로고가 없으면 `null`(화면 이니셜).
   * 이 필드가 없는 옛 서버면 `null`(계약 깨짐이 아니다 — 로고는 꾸밈이다)
   */
  logoUrl: string | null;
}

export interface KrDetailVM {
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

export interface KrCandleVM {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KrSearchItemVM {
  code: string;
  name: string;
  market: KrMarket;
  inUniverse: boolean;
}

/** 실시간 체결 → WS `price_update.data`. 코인과 같은 필드 이름(`currentPrice` · `change24h`)에 `assetType` 만 더한다 */
export interface KrPriceUpdate {
  assetType: "kr_stock";
  symbol: string;
  currentPrice: number;
  /**
   * 전일 종가 대비 등락률(%) — 코인 `change24h` 도 업비트 `signed_change_rate`(전일 종가 대비)라 뜻이 같다.
   * 이름만 코인 계약을 따른다(F011 FR-24 "코인과 같은 메시지 형태")
   */
  change24h: number;
  /** 전일 종가 대비 금액 — 서버(KIS) 값을 옮긴다 */
  change24hAmount: number;
  timestamp: string;
}

/** 서버 응답이 계약과 다르다 — 서비스가 `unavailable` 로 바꾼다 */
export class KrContractError extends Error {
  constructor(field: string) {
    super(`kr_stock contract: ${field}`);
  }
}

type Raw = Record<string, unknown>;

const obj = (v: unknown, field: string): Raw => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new KrContractError(field);
  return v as Raw;
};
const str = (r: Raw, k: string): string => {
  if (typeof r[k] !== "string") throw new KrContractError(k);
  return r[k] as string;
};
const strOrNull = (r: Raw, k: string): string | null => (r[k] === null || r[k] === undefined ? null : str(r, k));
const num = (r: Raw, k: string): number => {
  if (typeof r[k] !== "number" || !Number.isFinite(r[k])) throw new KrContractError(k);
  return r[k] as number;
};
const numOrNull = (r: Raw, k: string): number | null => (r[k] === null || r[k] === undefined ? null : num(r, k));
const bool = (r: Raw, k: string): boolean => {
  if (typeof r[k] !== "boolean") throw new KrContractError(k);
  return r[k] as boolean;
};
const oneOf = <T extends string>(r: Raw, k: string, values: readonly T[]): T => {
  const v = r[k];
  if (typeof v !== "string" || !(values as readonly string[]).includes(v)) throw new KrContractError(k);
  return v as T;
};
const arr = (r: Raw, k: string): unknown[] => {
  if (!Array.isArray(r[k])) throw new KrContractError(k);
  return r[k] as unknown[];
};

export const toKrSessionVM = (raw: unknown): KrSessionVM => {
  const r = obj(raw, "session");
  return {
    session: oneOf(r, "session", KR_SESSIONS),
    now: str(r, "now"),
    lastCloseAt: strOrNull(r, "lastCloseAt"),
    nextOpenAt: strOrNull(r, "nextOpenAt"),
    calendarKnown: bool(r, "calendarKnown"),
  };
};

const toProviderVM = (raw: unknown): KrProviderVM => {
  const r = obj(raw, "provider");
  const rt = obj(r.realtime, "provider.realtime");
  return {
    status: oneOf(r, "status", ["ok", "degraded"] as const),
    since: strOrNull(r, "since"),
    lastSuccessAt: strOrNull(r, "lastSuccessAt"),
    realtime: { state: oneOf(rt, "state", KR_REALTIME_STATES), lastTickAt: strOrNull(rt, "lastTickAt") },
  };
};

/** `GET /api/market/kr/session` — 장 상태 + KIS 상태 */
export const toKrMarketStatusVM = (raw: unknown): KrSessionVM & { provider: KrProviderVM } => {
  const r = obj(raw, "data");
  return { ...toKrSessionVM(r), provider: toProviderVM(r.provider) };
};

export const toKrQuoteVM = (raw: unknown): KrQuoteVM => {
  const r = obj(raw, "quote");
  const limitState = r.limitState === null || r.limitState === undefined ? null : oneOf(r, "limitState", ["upper", "lower"] as const);
  return {
    code: str(r, "code"),
    name: str(r, "name"),
    market: oneOf(r, "market", KR_MARKETS),
    price: num(r, "price"),
    change: num(r, "change"),
    changeRate: num(r, "changeRate"),
    volume: str(r, "volume"),
    tradeValue: num(r, "tradeValue"),
    marketCap: numOrNull(r, "marketCap"),
    basePrice: numOrNull(r, "basePrice"),
    upperLimit: numOrNull(r, "upperLimit"),
    lowerLimit: numOrNull(r, "lowerLimit"),
    openPrice: numOrNull(r, "openPrice"),
    highPrice: numOrNull(r, "highPrice"),
    lowPrice: numOrNull(r, "lowPrice"),
    limitState,
    status: arr(r, "status").filter((s): s is KrStatusBadge => (KR_STATUS_BADGES as readonly unknown[]).includes(s)),
    isHalted: bool(r, "isHalted"),
    feed: oneOf(r, "feed", KR_FEEDS),
    priceUpdatedAt: str(r, "priceUpdatedAt"),
    logoUrl: strOrNull(r, "logoUrl"),
  };
};

/** `GET /api/market/kr/assets` — 시세 표(시총 순) */
export const toKrOverviewVM = (raw: unknown) => {
  const r = obj(raw, "data");
  const nextOffset = numOrNull(r, "nextOffset");
  return {
    session: toKrSessionVM(r.session),
    items: arr(r, "items").map((item): KrOverviewItemVM => ({
      ...toKrQuoteVM(item),
      periodChange: numOrNull(obj(item, "quote"), "periodChange"),
    })),
    nextOffset,
  };
};

/** `GET /api/market/kr/:code` — 현재가 + 투자 지표 · 호가 단위 */
export const toKrDetailVM = (raw: unknown) => {
  const r = obj(raw, "data");
  const d = obj(r.detail, "detail");
  const detail: KrDetailVM = {
    per: numOrNull(d, "per"),
    pbr: numOrNull(d, "pbr"),
    eps: numOrNull(d, "eps"),
    bps: numOrNull(d, "bps"),
    week52High: numOrNull(d, "week52High"),
    week52Low: numOrNull(d, "week52Low"),
    foreignRate: numOrNull(d, "foreignRate"),
    tickSize: num(d, "tickSize"),
  };
  return { session: toKrSessionVM(r.session), quote: toKrQuoteVM(r.quote), detail };
};

/** `GET /api/market/kr/:code/chart` — 봉 + 몇 거래일치인지(5분봉은 쌓이는 중이라 숨기지 않는다, FR-46) */
export const toKrChartVM = (raw: unknown) => {
  const r = obj(raw, "data");
  const coverage = obj(r.coverage, "coverage");
  return {
    period: oneOf(r, "period", ["1d", "5m"] as const),
    candles: arr(r, "candles").map((c): KrCandleVM => {
      const x = obj(c, "candle");
      return {
        timestamp: str(x, "timestamp"),
        open: num(x, "open"),
        high: num(x, "high"),
        low: num(x, "low"),
        close: num(x, "close"),
        volume: num(x, "volume"),
      };
    }),
    coverage: { from: strOrNull(coverage, "from"), to: strOrNull(coverage, "to"), tradingDays: num(coverage, "tradingDays") },
  };
};

/** `GET /api/market/kr/search` — 마스터 전체에서 이름 · 코드 */
export const toKrSearchVM = (raw: unknown) => {
  const r = obj(raw, "data");
  return {
    items: arr(r, "items").map((i): KrSearchItemVM => {
      const x = obj(i, "item");
      return { code: str(x, "code"), name: str(x, "name"), market: oneOf(x, "market", KR_MARKETS), inUniverse: bool(x, "inUniverse") };
    }),
  };
};

/**
 * 서버 SSE `event: tick` 의 체결 하나 → WS `price_update.data`. 모양이 틀린 체결은 `null` — 하나 때문에 묶음을 버리지 않는다
 */
export const toKrPriceUpdate = (raw: unknown): KrPriceUpdate | null => {
  try {
    const r = obj(raw, "tick");
    return {
      assetType: "kr_stock",
      symbol: str(r, "code"),
      currentPrice: num(r, "price"),
      change24h: num(r, "changeRate"),
      change24hAmount: num(r, "change"),
      timestamp: str(r, "at"),
    };
  } catch {
    return null;
  }
};
