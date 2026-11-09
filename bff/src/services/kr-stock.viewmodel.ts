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

/**
 * 종목 상태 칩 — 서버 `krStatusBadges` 와 같은 값. F016 단계 A(2026-11-06)에 임시정지 · VI · 투자유의 · 정리매매를 더했다.
 * 모르는 값은 버린다(옛 화면이 새 서버를 만나도 깨지지 않게)
 */
export const KR_STATUS_BADGES = [
  "halted",
  "paused",
  "vi",
  "administrative",
  "caution",
  "warning",
  "danger",
  "attention",
  "liquidation",
  "overheat",
] as const;
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
  /** "왜 움직였나" 카드가 서는 날인가(F016 단계 C · 서버 판정 — 상세 카드와 같은 문턱). 옛 서버면 `false` */
  moveCard: boolean;
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
  /** 평일 휴장 사유(F011 FR-41, 서버 KRX 공시 표) — 휴장이 아니거나 표에 없으면 `null`. 이 필드가 없는 옛 서버 응답도 `null` */
  holidayName: string | null;
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
  /** VI 발동 중일 때만(F016 단계 A) — 종류 · 발동 시각은 못 받았으면 `null`. 이 필드가 없는 옛 서버면 `null` */
  vi: KrViVM | null;
  /**
   * 마지막 체결 시각 — 서버가 **값이 멈춘 이유가 있을 때만**(거래정지 · 임시정지 · VI · 그 시장 서킷브레이커) 채운다.
   * 화면은 있으면 "마지막 체결 HH:MM:SS" 를 그린다(보일지 판단 0)
   */
  lastTradeAt: string | null;
  feed: KrFeed;
  priceUpdatedAt: string;
  /**
   * 시간외 단일가(16:00~18:00 · F011 FR-27) — 정규장 현재가 · 등락과 따로. 서버가 마지막 정규장 마감 뒤 값만 주고
   * 정규장이 열리면 `null`. 이 필드가 없는 옛 서버면 `null`
   */
  afterHours: KrAfterHoursVM | null;
  /**
   * 로고 주소 — 서버가 종목마다 판정한 logo.dev 주소. 키가 없거나 선명한 로고가 없으면 `null`(화면 이니셜).
   * 이 필드가 없는 옛 서버면 `null`(계약 깨짐이 아니다 — 로고는 꾸밈이다)
   */
  logoUrl: string | null;
}

export const KR_VI_KINDS = ["static", "dynamic", "both"] as const;
export interface KrViVM {
  kind: (typeof KR_VI_KINDS)[number] | null;
  triggeredAt: string | null;
  count: number | null;
}

/** 오늘 시장 조치(F016 단계 A · `BFF-REQ-051` FR-2) — 서킷브레이커 · 사이드카. `active` · `resumesAt` 은 서버 값 */
export const KR_MARKET_ACTION_KINDS = ["circuit_breaker", "sidecar"] as const;
export interface KrMarketActionVM {
  market: KrMarket;
  kind: (typeof KR_MARKET_ACTION_KINDS)[number];
  stage: number;
  direction: "up" | "down";
  startedAt: string;
  endedAt: string | null;
  resumesAt: string | null;
  /** `inferred` 면 화면이 "추정"을 붙인다 */
  source: "feed" | "inferred";
  active: boolean;
}

export interface KrAfterHoursVM {
  price: number;
  /** 정규장 종가 대비(원, 부호 포함) */
  change: number;
  changeRate: number;
  /** 시간외 누적 거래량(주, 문자열) */
  volume: string;
  /** 받은 회차 시각 */
  at: string;
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
    holidayName: strOrNull(r, "holidayName"),
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
    vi: toViVM(r.vi),
    lastTradeAt: strOrNull(r, "lastTradeAt"),
    feed: oneOf(r, "feed", KR_FEEDS),
    priceUpdatedAt: str(r, "priceUpdatedAt"),
    afterHours: toAfterHoursVM(r.afterHours),
    logoUrl: strOrNull(r, "logoUrl"),
  };
};

const toViVM = (raw: unknown): KrViVM | null => {
  if (raw === null || raw === undefined) return null;
  const r = obj(raw, "vi");
  return {
    kind: r.kind === null || r.kind === undefined ? null : oneOf(r, "kind", KR_VI_KINDS),
    triggeredAt: strOrNull(r, "triggeredAt"),
    count: numOrNull(r, "count"),
  };
};

/**
 * 시장 조치 목록 — 이 필드가 없는 옛 서버면 빈 배열. 모르는 kind 는 버린다(새 조치 종류가 화면을 깨지 않게).
 * 모양이 틀린 행은 계약 오류다 — 정지 띠를 조용히 지우지 않는다
 */
export const toKrMarketActionsVM = (raw: unknown): KrMarketActionVM[] => {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) throw new KrContractError("marketActions");
  return raw.flatMap((item): KrMarketActionVM[] => {
    const r = obj(item, "marketAction");
    if (!(KR_MARKET_ACTION_KINDS as readonly unknown[]).includes(r.kind)) return [];
    return [
      {
        market: oneOf(r, "market", KR_MARKETS),
        kind: r.kind as KrMarketActionVM["kind"],
        stage: num(r, "stage"),
        direction: oneOf(r, "direction", ["up", "down"] as const),
        startedAt: str(r, "startedAt"),
        endedAt: strOrNull(r, "endedAt"),
        resumesAt: strOrNull(r, "resumesAt"),
        source: oneOf(r, "source", ["feed", "inferred"] as const),
        active: bool(r, "active"),
      },
    ];
  });
};

const toAfterHoursVM = (raw: unknown): KrAfterHoursVM | null => {
  if (raw === null || raw === undefined) return null;
  const r = obj(raw, "afterHours");
  return {
    price: num(r, "price"),
    change: num(r, "change"),
    changeRate: num(r, "changeRate"),
    volume: str(r, "volume"),
    at: str(r, "at"),
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
      moveCard: obj(item, "quote").moveCard === true,
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
  // 이 종목 시장의 오늘 조치 — 상세 머리 띠(FE-REQ-063 FR-2)
  return { session: toKrSessionVM(r.session), quote: toKrQuoteVM(r.quote), detail, marketActions: toKrMarketActionsVM(r.marketActions) };
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

// ==================== 부가 정보 (F011 슬라이스 6 · FR-27 · 28) ====================

/** 지수 한 칸 — 이름 · 순서는 서버 설정(`KIS_SUMMARY_INDICES`)이 정한다. 값은 포인트 */
export interface KrIndexVM {
  code: string;
  name: string;
  value: number;
  change: number;
  changeRate: number;
  /** 상승 · 보합 · 하락 종목 수 — 없으면 `null`(그 줄을 그리지 않는다) */
  advancers: number | null;
  unchanged: number | null;
  decliners: number | null;
  updatedAt: string;
  /** 시세 시간대인데 3분 넘게 안 바뀌었다 — 서버 판정 */
  stale: boolean;
}

/** `GET /api/market/kr/indices` — 국내 주식 탭 요약 띠. 서버가 한 번도 못 받은 지수는 빠져 온다 */
export const toKrIndicesVM = (raw: unknown) => {
  const r = obj(raw, "data");
  return {
    session: toKrSessionVM(r.session),
    items: arr(r, "items").map((i): KrIndexVM => {
      const x = obj(i, "index");
      return {
        code: str(x, "code"),
        name: str(x, "name"),
        value: num(x, "value"),
        change: num(x, "change"),
        changeRate: num(x, "changeRate"),
        advancers: numOrNull(x, "advancers"),
        unchanged: numOrNull(x, "unchanged"),
        decliners: numOrNull(x, "decliners"),
        updatedAt: str(x, "updatedAt"),
        stale: bool(x, "stale"),
      };
    }),
  };
};

/** 순매수(매수 − 매도) — 수량은 주(서버가 BigInt 를 문자열로), 금액은 원 정수. 음수면 순매도 */
export interface KrInvestorNetVM {
  quantity: string;
  value: number;
}

export interface KrInvestorDayVM {
  /** 거래일(KST, YYYY-MM-DD) */
  date: string;
  individual: KrInvestorNetVM;
  foreign: KrInvestorNetVM;
  institution: KrInvestorNetVM;
}

const toNetVM = (raw: unknown, field: string): KrInvestorNetVM => {
  const r = obj(raw, field);
  return { quantity: str(r, "quantity"), value: num(r, "value") };
};

/**
 * `GET /api/market/kr/:code/investors` — 최근 거래일(최신이 앞) + 기간 합계. 합계는 서버가 낸다(금액 계산 0건).
 * 아직 안 모였으면 `rows: []` · `totals: null` — 0 으로 바꾸지 않는다
 */
export const toKrInvestorsVM = (raw: unknown) => {
  const r = obj(raw, "data");
  const totals = r.totals === null || r.totals === undefined ? null : obj(r.totals, "totals");
  return {
    code: str(r, "code"),
    days: num(r, "days"),
    collectedAt: strOrNull(r, "collectedAt"),
    rows: arr(r, "rows").map((d): KrInvestorDayVM => {
      const x = obj(d, "row");
      return {
        date: str(x, "date"),
        individual: toNetVM(x.individual, "individual"),
        foreign: toNetVM(x.foreign, "foreign"),
        institution: toNetVM(x.institution, "institution"),
      };
    }),
    totals: totals
      ? {
          individual: toNetVM(totals.individual, "totals.individual"),
          foreign: toNetVM(totals.foreign, "totals.foreign"),
          institution: toNetVM(totals.institution, "totals.institution"),
        }
      : null,
  };
};

// ==================== 오늘 소식 · 장중 수급 (F016 단계 B · BFF-REQ-051 FR-3 · 4) ====================

export type KrNewsKindVM = "news" | "disclosure";

export interface KrNewsItemVM {
  id: string;
  /** 공시 · 시황 칩 — 서버 판정 그대로 */
  kind: KrNewsKindVM;
  provider: string;
  title: string;
  publishedAt: string;
  /** 관련 종목 — 뉴스 상세 모달 칩(`FE-REQ-065`). 이름 · 등락률(%) 서버 값 그대로 · 옛 서버면 빈 배열 */
  related: Array<{ code: string; name: string; changeRate: number | null }>;
}

const KR_NEWS_KINDS: readonly KrNewsKindVM[] = ["news", "disclosure"];

/**
 * `GET /api/market/kr/:code/news` — 오늘 시황 · 공시 제목(최신이 앞, 광고성 제외는 서버). **링크 · 본문 칸 없음**(원천에 없다).
 * 모르는 `kind` 는 버린다(새 서버가 종류를 늘려도 화면이 모르는 칩을 그리지 않게). `collectedAt` 은 시장 전체 마지막 수집
 */
export const toKrNewsVM = (raw: unknown) => {
  const r = obj(raw, "data");
  return {
    code: str(r, "code"),
    date: str(r, "date"),
    collectedAt: strOrNull(r, "collectedAt"),
    items: arr(r, "items").flatMap((d): KrNewsItemVM[] => {
      const x = obj(d, "item");
      const kind = str(x, "kind");
      if (!(KR_NEWS_KINDS as readonly string[]).includes(kind)) return [];
      return [
        {
          id: str(x, "id"),
          kind: kind as KrNewsKindVM,
          provider: str(x, "provider"),
          title: str(x, "title"),
          publishedAt: str(x, "publishedAt"),
          related: (Array.isArray(x.related) ? x.related : []).map((rel) => {
            const r = obj(rel, "related");
            return { code: str(r, "code"), name: str(r, "name"), changeRate: numOrNull(r, "changeRate") };
          }),
        },
      ];
    }),
  };
};

/** 장중 프로그램 매매 누적 — 금액은 원 정수 · 수량은 주(문자열). 서버 값 그대로(합 · 차 계산 0) */
export interface KrProgramFlowVM {
  at: string;
  netQuantity: string;
  netValue: number;
  buyValue: number;
  sellValue: number;
  collectedAt: string;
}

/** `GET /api/market/kr/:code/flows/intraday` — 오늘 값이 없으면 `program: null`(장 전 · 휴장 · 유니버스 밖) */
export const toKrIntradayFlowsVM = (raw: unknown) => {
  const r = obj(raw, "data");
  const p = r.program === null || r.program === undefined ? null : obj(r.program, "program");
  return {
    code: str(r, "code"),
    date: str(r, "date"),
    program: p
      ? ({
          at: str(p, "at"),
          netQuantity: str(p, "netQuantity"),
          netValue: num(p, "netValue"),
          buyValue: num(p, "buyValue"),
          sellValue: num(p, "sellValue"),
          collectedAt: str(p, "collectedAt"),
        } satisfies KrProgramFlowVM)
      : null,
  };
};

// ==================== 호가 (F011 슬라이스 6b · FR-28) ====================

/** 호가 한 단계 — 가격은 원 정수, 잔량은 주(서버가 BigInt 를 문자열로) */
export interface KrOrderbookLevelVM {
  price: number;
  quantity: string;
}

const toLevelVM = (raw: unknown): KrOrderbookLevelVM => {
  const r = obj(raw, "level");
  return { price: num(r, "price"), quantity: str(r, "quantity") };
};

/**
 * `GET /api/market/kr/:code/orderbook` — 매도 · 매수 모두 1단계(최우선)부터. 서버가 요청 시점에 KIS 를 부르고
 * 10초 캐시한다. `available: false` 면 한 번도 못 받았다(빈 호가) · `stale` 이면 받아 둔 값이다
 */
export const toKrOrderbookVM = (raw: unknown) => {
  const r = obj(raw, "data");
  return {
    code: str(r, "code"),
    available: bool(r, "available"),
    asks: arr(r, "asks").map(toLevelVM),
    bids: arr(r, "bids").map(toLevelVM),
    totalAskQuantity: strOrNull(r, "totalAskQuantity"),
    totalBidQuantity: strOrNull(r, "totalBidQuantity"),
    at: strOrNull(r, "at"),
    fetchedAt: strOrNull(r, "fetchedAt"),
    stale: bool(r, "stale"),
  };
};

/**
 * 다가오는 국내 시장 일정(`BFF-REQ-043` FR-3) — 날짜 · 종류 · 남은 날만. 종류 · 기간은 서버가 정한다(프론트 상수 0).
 * 모르는 종류 · 깨진 행은 버린다(새 종류를 서버가 먼저 늘려도 이름 없는 행이 화면에 가지 않는다)
 */
export type KrScheduleKind = "kr_bok_rate" | "kr_cpi" | "kr_trade" | "kr_quad_expiry";
const KR_SCHEDULE_KINDS: readonly KrScheduleKind[] = ["kr_bok_rate", "kr_cpi", "kr_trade", "kr_quad_expiry"];

export interface KrScheduleItemVM {
  kind: KrScheduleKind;
  eventAt: string;
  daysUntil: number;
}

export const toKrScheduleVM = (raw: unknown): { days: number; items: KrScheduleItemVM[] } => {
  const r = obj(raw, "data");
  return {
    days: num(r, "days"),
    items: arr(r, "items").flatMap((i): KrScheduleItemVM[] => {
      const x = i as Record<string, unknown> | null;
      if (
        !x ||
        !KR_SCHEDULE_KINDS.includes(x.kind as KrScheduleKind) ||
        typeof x.eventAt !== "string" ||
        !Number.isInteger(x.daysUntil)
      ) {
        return [];
      }
      return [{ kind: x.kind as KrScheduleKind, eventAt: x.eventAt, daysUntil: x.daysUntil as number }];
    }),
  };
};

// ==================== 국내 요약 띠 (BFF-REQ-044 · 서버 SRV-REQ-042) ====================

/** 화면이 아는 태그 — 코인 요약(`market-summary.viewmodel` `KNOWN_SUMMARY_TAGS`)과 같은 값. 모르는 코드는 버린다 */
const KR_SUMMARY_TAGS = ["wide_move"] as const;
export type KrSummaryTagVM = (typeof KR_SUMMARY_TAGS)[number];
const KR_SUMMARY_KINDS = ["index", "stock"] as const;

/**
 * 국내 요약 한 칸 — 코인 `MarketSummaryItemVM` 과 **같은 이름 · 같은 뜻**(화면이 같은 칸 컴포넌트로 그린다) + `kind`.
 * 다른 점 셋: 등락이 전일 종가 대비(응답 `changeBasis`) · 지수는 로고가 없다(`logoUrl: null`) · 고가 · 저가 · 거래대금은
 * 못 받았으면 `null`(0 이 아니다)
 */
export interface KrSummaryItemVM {
  symbol: string;
  /** 지수 칸은 링크가 없다(상세 화면이 없다) */
  kind: (typeof KR_SUMMARY_KINDS)[number];
  name: string;
  logoUrl: string | null;
  currentPrice: number;
  change24h: number;
  /** 서버가 반올림한 전일 대비 금액(종목 원 정수 · 지수 포인트) */
  change24hAmount: number;
  tags: KrSummaryTagVM[];
  sparkline: number[] | null;
  high24h: number | null;
  low24h: number | null;
  tradeValue24h: number | null;
}

export interface KrMarketSummaryVM {
  assetClass: "kr_stock";
  changeBasis: "prev_close";
  featured: KrSummaryItemVM | null;
  items: KrSummaryItemVM[];
  sparklineWindowMinutes: number;
  /** 스파크라인이 그린 날(KST `YYYY-MM-DD`) — 화면이 "오늘 장중" · "10/31 장중" 을 고른다 */
  sparklineDate: string | null;
  breadth: { up: number; flat: number; down: number; total: number } | null;
  /** 국내 뉴스는 모으지 않는다 — 늘 빈 배열. 소식 자리는 `schedule` */
  headlines: [];
  schedule: KrScheduleItemVM[];
  /** 오늘 시장 조치 — 국내 요약 띠의 정지 띠(F016 단계 A · `BFF-REQ-051` FR-2) */
  marketActions: KrMarketActionVM[];
  degraded: boolean;
}

const toKrSummaryItemVM = (raw: unknown): KrSummaryItemVM => {
  const x = obj(raw, "summaryItem");
  const sparkline = x.sparkline;
  if (sparkline !== null && !(Array.isArray(sparkline) && sparkline.every((v) => typeof v === "number"))) {
    throw new KrContractError("sparkline");
  }
  return {
    symbol: str(x, "symbol"),
    kind: oneOf(x, "kind", KR_SUMMARY_KINDS),
    name: str(x, "koreanName") || str(x, "symbol"),
    logoUrl: strOrNull(x, "logoUrl"),
    currentPrice: num(x, "currentPrice"),
    change24h: num(x, "change24h"),
    change24hAmount: num(x, "change24hAmount"),
    tags: (Array.isArray(x.tags) ? x.tags : []).filter((t): t is KrSummaryTagVM =>
      (KR_SUMMARY_TAGS as readonly unknown[]).includes(t),
    ),
    // 점 하나는 선이 아니다 — 코인 뷰모델과 같은 규칙
    sparkline: sparkline && sparkline.length >= 2 ? (sparkline as number[]) : null,
    high24h: numOrNull(x, "high24h"),
    low24h: numOrNull(x, "low24h"),
    tradeValue24h: numOrNull(x, "tradeValue24h"),
  };
};

/** `GET /api/market/kr/summary` — 계산 없음. 서버 `degraded` 는 지우지 않고 옮긴다(`bff-architecture.md` §5) */
export const toKrMarketSummaryVM = (raw: unknown): KrMarketSummaryVM => {
  const r = obj(raw, "data");
  if (r.assetClass !== "kr_stock" || r.changeBasis !== "prev_close") throw new KrContractError("assetClass");
  const breadth = r.breadth === null || r.breadth === undefined ? null : obj(r.breadth, "breadth");
  const total = breadth ? num(breadth, "total") : 0;
  return {
    assetClass: "kr_stock",
    changeBasis: "prev_close",
    featured: r.featured === null ? null : toKrSummaryItemVM(r.featured),
    items: arr(r, "items").map(toKrSummaryItemVM),
    sparklineWindowMinutes: num(r, "sparklineWindowMinutes"),
    sparklineDate: strOrNull(r, "sparklineDate"),
    // 합이 0 이면 셀 것이 없던 것이다 — 빈 막대를 그리지 않게 null(코인 뷰모델과 같다)
    breadth:
      breadth && total > 0
        ? { up: num(breadth, "up"), flat: num(breadth, "flat"), down: num(breadth, "down"), total }
        : null,
    headlines: [],
    schedule: toKrScheduleVM({ days: 0, items: r.schedule ?? [] }).items,
    marketActions: toKrMarketActionsVM(r.marketActions),
    degraded: bool(r, "degraded"),
  };
};
