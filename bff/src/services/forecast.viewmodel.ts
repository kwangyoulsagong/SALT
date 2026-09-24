/**
 * 가격 변동 범위 뷰모델 — **순수 함수** (F008 `BFF-REQ-037` · `ADR-003`).
 *
 * 서버 `GET /api/coach/forecast` 가 이미 조립한다(가격 환산 · 원화 시나리오 · 게이트). BFF 가 하는 일:
 *
 * 1. **전망 3종이 빠진 기간을 막는다.** 서버가 `renderable: true` 인데 채점 이력(표본 · 커버리지) ·
 *    기준 대비(폭 · 기준 폭) · 빗나간 사례 중 하나라도 비었으면 범위 · 시나리오를 떨어뜨리고
 *    `contract_incomplete` 로 막는다. **막을 수만 있고 열 수는 없다** — `true` 를 만드는 경로가 없다
 * 2. 방향(`direction`)은 서버가 줄 때만 옮긴다. 없으면 필드 자체가 없다(기준을 못 이긴 기간)
 * 3. 기간 4개를 항상 준다 — 서버가 빠뜨린 기간은 `not_generated`
 *
 * 하지 않는 것: 가격 · 원화 계산(공통 수용 기준 3) · 게이트 판정 · 문구.
 */

export interface ForecastRange {
  low: number;
  lowerQuartile: number;
  median: number;
  upperQuartile: number;
  high: number;
  coverage: 90;
}

export interface ForecastScenario {
  quantity: number;
  valueChangeLow: number;
  valueChangeMedian: number;
  valueChangeHigh: number;
}

export interface ForecastTrackRecord {
  kind: "backtest" | "live";
  sample: number;
  coverage90: number;
  width90: number;
  baselineWidth90: number;
  pinballSkill: number | null;
  misses: { asOf: string; realizedReturn: number; lowReturn: number; highReturn: number }[];
}

export interface ForecastDirection {
  upProbability: number;
  direction: "up" | "down" | "abstain";
  calls: number;
  hits: number;
  baseRate: number | null;
}

export type ForecastHorizon =
  | {
      horizonWeeks: number;
      renderable: true;
      asOf: string;
      basePrice: number;
      range: ForecastRange;
      scenario: ForecastScenario | null;
      trackRecord: ForecastTrackRecord;
      direction?: ForecastDirection;
    }
  | { horizonWeeks: number; renderable: false; blockedReason: string };

/** 과거 일봉 종가(오래된 → 최근). 차트의 실선 — 전망의 기준가와 같은 원천(업비트 1d) */
export interface ForecastHistoryPoint {
  date: string;
  close: number;
}

export type ForecastResult =
  | {
      status: "ok";
      symbol: string;
      label: string;
      disclaimer: string;
      history: ForecastHistoryPoint[];
      horizons: ForecastHorizon[];
    }
  | { status: "unavailable" };

const HORIZONS = [1, 2, 3, 4];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const toRange = (r: unknown): ForecastRange | null => {
  const o = r as Record<string, unknown> | null;
  if (!o || ![o.low, o.lowerQuartile, o.median, o.upperQuartile, o.high].every(isNum)) return null;
  return {
    low: o.low as number,
    lowerQuartile: o.lowerQuartile as number,
    median: o.median as number,
    upperQuartile: o.upperQuartile as number,
    high: o.high as number,
    coverage: 90,
  };
};

const toTrack = (t: unknown): ForecastTrackRecord | null => {
  const o = t as Record<string, unknown> | null;
  if (!o || !isNum(o.sample) || o.sample <= 0) return null;
  if (![o.coverage90, o.width90, o.baselineWidth90].every(isNum)) return null;
  const misses = Array.isArray(o.misses) ? (o.misses as ForecastTrackRecord["misses"]) : [];
  if (misses.length === 0) return null; // 빗나간 사례 — 전망 3종
  return {
    kind: o.kind === "live" ? "live" : "backtest",
    sample: o.sample,
    coverage90: o.coverage90 as number,
    width90: o.width90 as number,
    baselineWidth90: o.baselineWidth90 as number,
    pinballSkill: isNum(o.pinballSkill) ? o.pinballSkill : null,
    misses: misses.slice(0, 3),
  };
};

const toScenario = (s: unknown): ForecastScenario | null => {
  const o = s as Record<string, unknown> | null;
  if (!o || ![o.quantity, o.valueChangeLow, o.valueChangeMedian, o.valueChangeHigh].every(isNum)) return null;
  return {
    quantity: o.quantity as number,
    valueChangeLow: o.valueChangeLow as number,
    valueChangeMedian: o.valueChangeMedian as number,
    valueChangeHigh: o.valueChangeHigh as number,
  };
};

const toHorizon = (h: number, raw: Record<string, unknown> | undefined): ForecastHorizon => {
  if (!raw) return { horizonWeeks: h, renderable: false, blockedReason: "not_generated" };
  if (raw.renderable !== true) {
    return { horizonWeeks: h, renderable: false, blockedReason: String(raw.blockedReason ?? "insufficient_sample") };
  }
  const range = toRange(raw.range);
  const trackRecord = toTrack(raw.trackRecord);
  if (!range || !trackRecord || !isNum(raw.basePrice) || typeof raw.asOf !== "string") {
    return { horizonWeeks: h, renderable: false, blockedReason: "contract_incomplete" };
  }
  const view: ForecastHorizon = {
    horizonWeeks: h,
    renderable: true,
    asOf: raw.asOf,
    basePrice: raw.basePrice,
    range,
    scenario: toScenario(raw.scenario),
    trackRecord,
  };
  const d = raw.direction as Record<string, unknown> | undefined;
  if (d && isNum(d.upProbability) && (d.direction === "up" || d.direction === "down" || d.direction === "abstain")) {
    view.direction = {
      upProbability: d.upProbability,
      direction: d.direction,
      calls: isNum(d.calls) ? d.calls : 0,
      hits: isNum(d.hits) ? d.hits : 0,
      baseRate: isNum(d.baseRate) ? d.baseRate : null,
    };
  }
  return view;
};

/** 모양이 깨진 점은 버린다 — 선이 끊기는 것이 틀린 점을 긋는 것보다 낫다 */
const toHistory = (raw: unknown): ForecastHistoryPoint[] =>
  Array.isArray(raw)
    ? (raw as Record<string, unknown>[])
        .filter((p) => typeof p?.date === "string" && isNum(p.close) && p.close > 0)
        .map((p) => ({ date: p.date as string, close: p.close as number }))
    : [];

export const toForecastViewModel = (data: Record<string, unknown>): ForecastResult => {
  const horizons = Array.isArray(data.horizons) ? (data.horizons as Record<string, unknown>[]) : [];
  // 면책이 없으면 전체를 내보내지 않는다(`BFF-REQ-025` FR-22 — 면책은 정책)
  if (typeof data.disclaimer !== "string" || data.disclaimer === "") return { status: "unavailable" };
  return {
    status: "ok",
    symbol: String(data.symbol ?? ""),
    label: String(data.label ?? ""),
    disclaimer: data.disclaimer,
    history: toHistory(data.history),
    horizons: HORIZONS.map((h) => toHorizon(h, horizons.find((x) => x.horizonWeeks === h))),
  };
};
