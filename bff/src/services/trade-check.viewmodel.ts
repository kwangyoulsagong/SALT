/**
 * 사기 전 · 팔기 전 점검 뷰모델 — **순수 함수**(F017 v2 단계 2 · `BFF-REQ-052` FR-3).
 *
 * 서버 `GET /api/coach/check` 를 화면 모양으로 옮긴다. **`summary` 는 서버 문장 그대로** — BFF 가 문장 · 숫자를 고치지 않는다.
 * 비율 · 분위는 0~1 · 로그수익 그대로(퍼센트 표기는 화면). 모양이 깨졌으면 `TradeCheckContractError` — 지어내지 않는다.
 */

export type TradeCheckStatus = "ok" | "below_min" | "no_condition";
export type TradeCheckSide = "buy" | "sell";

export interface TradeCheckRange {
  q10: number;
  q50: number;
  q90: number;
  text: string;
}

export interface TradeCheckHorizon {
  horizon: number;
  label: string;
  status: "ok" | "below_min";
  sample: number;
  sampleDays: number;
  upRate: number | null;
  mean: number | null;
  range: TradeCheckRange | null;
  hold: { upRate: number | null; range: TradeCheckRange | null };
}

export interface TradeCheckViewModel {
  symbol: string;
  market: "kr" | "crypto";
  side: TradeCheckSide;
  status: TradeCheckStatus;
  /** 맨 위 한 줄 — 서버 문장 그대로 */
  summary: string;
  conditionReason: "none_matched" | "stale_reference" | "not_covered" | null;
  condition: { id: string; phrase: string; describeOnly: boolean } | null;
  alsoMatched: { id: string; phrase: string }[];
  horizonLabel: string;
  /** 100칸 점 — 분모 100 고정, 칠할 칸 수(서버 비율 반올림). 비율이 없으면 null */
  dots: number | null;
  upRate: number | null;
  upRange: { low: number; high: number } | null;
  sample: number | null;
  sampleDays: number | null;
  sampleEffective: number | null;
  differsFromUsual: "higher" | "lower" | null;
  recentDiffers: boolean | null;
  usual: { upRate: number | null; holdUpRate: number | null; sample: number } | null;
  horizons: TradeCheckHorizon[];
  /** 팔기 전 + 보유 — 지금 팔면 확정되는 수익률(%). 펼침 칸에만 */
  holding: { realizedPct: number } | null;
  reference: { close: number | null; at: string | null; computedAt: string | null };
  disclaimer: string;
}

export class TradeCheckContractError extends Error {
  constructor(field: string) {
    super(`점검 응답 모양이 다르다: ${field}`);
    this.name = "TradeCheckContractError";
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const numOrNull = (v: unknown, field: string): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new TradeCheckContractError(field);
  return v;
};
const str = (v: unknown, field: string): string => {
  if (typeof v !== "string") throw new TradeCheckContractError(field);
  return v;
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], field: string): T => {
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) throw new TradeCheckContractError(field);
  return v as T;
};
const nullableOneOf = <T extends string>(v: unknown, allowed: readonly T[], field: string): T | null =>
  v === null || v === undefined ? null : oneOf(v, allowed, field);
const rate = (v: unknown, field: string): number | null => {
  const n = numOrNull(v, field);
  if (n !== null && (n < 0 || n > 1)) throw new TradeCheckContractError(field);
  return n;
};

const range = (q10: unknown, q50: unknown, q90: unknown, text: unknown, field: string): TradeCheckRange | null => {
  const [a, b, c] = [numOrNull(q10, `${field}.q10`), numOrNull(q50, `${field}.q50`), numOrNull(q90, `${field}.q90`)];
  if (a === null || b === null || c === null) return null;
  if (!(a <= b && b <= c)) throw new TradeCheckContractError(`${field} 분위 순서`);
  return { q10: a, q50: b, q90: c, text: typeof text === "string" ? text : "" };
};

export const toTradeCheckViewModel = (raw: unknown): TradeCheckViewModel => {
  if (!isObj(raw)) throw new TradeCheckContractError("data");
  const status = oneOf(raw.status, ["ok", "below_min", "no_condition"] as const, "status");
  const summary = str(raw.summary, "summary");
  if (summary.trim() === "") throw new TradeCheckContractError("summary 빈 문장");
  const upRate = rate(raw.upRate, "upRate");
  // below_min 은 비율이 없어야 한다 — 서버가 실수로 실어도 화면이 숫자를 그리지 않게 BFF 가 막는다(막을 수만 있다)
  if (status === "below_min" && upRate !== null) throw new TradeCheckContractError("below_min 인데 upRate");

  const condition = isObj(raw.condition)
    ? {
        id: str(raw.condition.id, "condition.id"),
        phrase: str(raw.condition.phrase, "condition.phrase"),
        describeOnly: raw.condition.describeOnly === true,
      }
    : null;
  const upRange =
    isObj(raw.upRange) && typeof raw.upRange.low === "number" && typeof raw.upRange.high === "number"
      ? { low: raw.upRange.low, high: raw.upRange.high }
      : null;
  const usual = isObj(raw.usual)
    ? {
        upRate: rate(raw.usual.upRate, "usual.upRate"),
        holdUpRate: rate(raw.usual.holdUpRate, "usual.holdUpRate"),
        sample: numOrNull(raw.usual.sample, "usual.sample") ?? 0,
      }
    : null;
  const horizons: TradeCheckHorizon[] = (Array.isArray(raw.distributions) ? raw.distributions : []).map((d, i) => {
    if (!isObj(d)) throw new TradeCheckContractError(`distributions[${i}]`);
    const hold = isObj(d.hold) ? d.hold : {};
    return {
      horizon: numOrNull(d.horizon, `distributions[${i}].horizon`) ?? 0,
      label: str(d.horizonLabel, `distributions[${i}].horizonLabel`),
      status: oneOf(d.status, ["ok", "below_min"] as const, `distributions[${i}].status`),
      sample: numOrNull(d.sample, `distributions[${i}].sample`) ?? 0,
      sampleDays: numOrNull(d.sampleDays, `distributions[${i}].sampleDays`) ?? 0,
      upRate: rate(d.upRate, `distributions[${i}].upRate`),
      mean: numOrNull(d.mean, `distributions[${i}].mean`),
      range: range(d.q10, d.q50, d.q90, d.rangeText, `distributions[${i}]`),
      hold: {
        upRate: rate(hold.upRate, `distributions[${i}].hold.upRate`),
        range: range(hold.q10, hold.q50, hold.q90, hold.rangeText, `distributions[${i}].hold`),
      },
    };
  });
  const reference = isObj(raw.reference) ? raw.reference : {};

  return {
    symbol: str(raw.symbol, "symbol"),
    market: oneOf(raw.market, ["kr", "crypto"] as const, "market"),
    side: oneOf(raw.side, ["buy", "sell"] as const, "side"),
    status,
    summary,
    conditionReason: nullableOneOf(
      raw.conditionReason,
      ["none_matched", "stale_reference", "not_covered"] as const,
      "conditionReason"
    ),
    condition,
    alsoMatched: (Array.isArray(raw.alsoMatched) ? raw.alsoMatched : [])
      .filter(isObj)
      .map((m) => ({ id: str(m.id, "alsoMatched.id"), phrase: str(m.phrase, "alsoMatched.phrase") })),
    horizonLabel: str(raw.horizonLabel, "horizonLabel"),
    dots: upRate === null ? null : Math.round(upRate * 100),
    upRate,
    upRange,
    sample: numOrNull(raw.sample, "sample"),
    sampleDays: numOrNull(raw.sampleDays, "sampleDays"),
    sampleEffective: numOrNull(raw.sampleEffective, "sampleEffective"),
    differsFromUsual: nullableOneOf(raw.differsFromUsual, ["higher", "lower"] as const, "differsFromUsual"),
    recentDiffers: typeof raw.recentDiffers === "boolean" ? raw.recentDiffers : null,
    usual,
    horizons,
    holding:
      isObj(raw.holding) && typeof raw.holding.realizedPct === "number" ? { realizedPct: raw.holding.realizedPct } : null,
    reference: {
      close: numOrNull(reference.close, "reference.close"),
      at: typeof reference.at === "string" ? reference.at : null,
      computedAt: typeof reference.computedAt === "string" ? reference.computedAt : null,
    },
    disclaimer: str(raw.disclaimer, "disclaimer"),
  };
};
