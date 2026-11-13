/**
 * 시나리오 늘 — 모든 종목 · 지평 넷에 과거 실제 결과(F017 v4 순서 1 · `SRV-REQ-053` FR-10 · `ADR-010` v4 · D20).
 *
 * 모델 확률(`shortHorizon.ts`)은 시험을 넘은 칸 · 소유자에게만 나온다 — 2026-11-13 실측으로 그런 칸이 0 이라 카드가 늘 비었다.
 * 그래서 칸마다 **과거에 실제로 그랬던 비율**(`base-rate@1` — 점검 한 줄과 같은 뷰)로 채운다. 예측이라 부르지 않는다(`source`).
 *
 * ## 불변식 — 칸이 비는 응답 0 · 어느 단을 썼는지 늘 실린다
 *
 * 내려가는 순서: 지금 성립한 조건(유효 n ≥ 100 = 예측 배치의 `ok`) → 그 시장 평소 → 한 단계 긴 지평 → 결함("아직 n번뿐").
 * 장중 지평(1h · 4h)의 기저율은 순서 3(`FC-REQ-028` FR-7)에서 생긴다 — 그 전엔 하루 값으로 내려가고 `fallbackFrom` 으로 말한다.
 *
 * ## 숫자는 가격이 실제로 움직인 분포(비용 전)
 *
 * 점검 한 줄은 "사서 수수료를 빼고도 오른 경우"(비용 뒤)지만 여기는 가격 길(부채꼴 · 틀리는 선)이라 예측 배치의 보유 연장 분포
 * (`hold_*` — 라벨 그대로)를 쓴다. 범위(Wilson 95%)는 같은 유효 표본으로 여기서 낸다 — 뷰에는 비용 뒤 범위만 있다.
 * '평소보다 많아요/적어요'는 예측이 Holm 을 통과시킨 방향이 **이 숫자에서도 같은 쪽일 때만**.
 */

import { CONDITION_PHRASE, type BaseRateRow, type TradeCheckMarket } from "./tradeCheck";
import type { ScenarioHorizonView } from "./shortHorizon";

export const PANEL_HORIZONS = ["1h", "4h", "1d", "5d"] as const;
export type PanelHorizon = (typeof PANEL_HORIZONS)[number];

/** 어느 단을 썼나 — `OPS-004` 가 종목 × 칸으로 센다 */
export type ScenarioTier = "now" | "usual" | "longer" | "defect";
export type ScenarioSource = "model" | "base_rate";

/** 지평 → `base-rate@1` 의 지평(거래일 · 일). 장중은 아직 없다(순서 3) */
export const BASE_RATE_HORIZON: Readonly<Record<PanelHorizon, number | null>> = { "1h": null, "4h": null, "1d": 1, "5d": 5 };

export const PANEL_HORIZON_LABEL: Readonly<Record<TradeCheckMarket, Readonly<Record<PanelHorizon, string>>>> = {
  crypto: { "1h": "다음 1시간", "4h": "다음 4시간", "1d": "다음 24시간", "5d": "다음 5일" },
  kr: { "1h": "다음 1시간", "4h": "다음 4시간", "1d": "다음 거래일 종가까지", "5d": "5거래일 뒤 종가까지" },
};

export interface ScenarioBaseRate {
  /** 지금 성립한 조건. 평소 값이면 null */
  condition: { id: string; phrase: string } | null;
  /** 숫자를 말할 수 있나 — `below_min` 은 결함 단에서만("아직 n번뿐") */
  status: "ok" | "below_min";
  sample: number;
  sampleEffective: number;
  sampleDays: number;
  /** 100번 중 오른 횟수(정수) */
  upCount100: number | null;
  /** Wilson 95% — 100번 중 몇 번 사이 */
  upRange: { low100: number; high100: number } | null;
  /** 기준 가격 대비 %(나빴던 10% · 가운데 · 좋았던 10%) */
  range: { lowPct: number; midPct: number; highPct: number } | null;
  /** 같은 지평 평소 — 100번 중 */
  usualUp100: number | null;
  differsFromUsual: "higher" | "lower" | null;
  /** 지금 가격 · 틀리는 선(= 지금 가격 × 나빴던 10%). 시세가 없으면 null */
  refPrice: number | null;
  invalidation: number | null;
  /** 기저율을 계산한 시각 */
  asOf: string | null;
}

export interface ScenarioCellView {
  horizon: PanelHorizon;
  horizonLabel: string;
  source: ScenarioSource;
  tier: ScenarioTier;
  /** 숫자를 빌려 온 지평(하루 기준으로 대신). 제 지평 값이면 null */
  fallbackFrom: PanelHorizon | null;
  /** 모델 칸(시험 상태 · 성적) — 소유자만 읽는다. 아니면 · 모델이 없는 지평(5d)이면 null */
  model: ScenarioHorizonView | null;
  /** 과거 실제 결과 — `source: base_rate` 일 때 늘 */
  baseRate: ScenarioBaseRate | null;
}

const Z95 = 1.959964;
/** Wilson 95% 구간 — 유효 표본(겹친 날을 줄인 n)으로 */
export const wilson95 = (rate: number, n: number): { low: number; high: number } | null => {
  if (!(n > 0) || rate < 0 || rate > 1) return null;
  const z2 = Z95 * Z95;
  const denom = 1 + z2 / n;
  const center = (rate + z2 / (2 * n)) / denom;
  const half = (Z95 * Math.sqrt((rate * (1 - rate)) / n + z2 / (4 * n * n))) / denom;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
};

const outOf100 = (rate: number) => Math.round(rate * 100);
const pct = (logReturn: number) => Math.round((Math.exp(logReturn) - 1) * 10_000) / 100;

/** 가격 모양으로 — 100원 이상은 원 단위, 그 아래(작은 코인)는 유효 숫자 넷. 화면이 소수 셋째 자리 원을 그리지 않게(2026-11-13 실화면) */
export const priceLike = (value: number): number => (value >= 100 ? Math.round(value) : Number(value.toPrecision(4)));

/** 숫자를 말할 수 있는 행 — 유효 n 문턱은 예측 배치가 정했다(`status`) */
const usable = (row: BaseRateRow | undefined): row is BaseRateRow =>
  row !== undefined && row.status === "ok" && row.holdUpRate !== null;

const toBaseRate = (
  row: BaseRateRow,
  usual: BaseRateRow | undefined,
  price: number | null,
  speakable: boolean
): ScenarioBaseRate => {
  const isCondition = row.kind !== "usual";
  const rate = speakable ? row.holdUpRate : null;
  const usualRate = usable(usual) ? usual.holdUpRate : null;
  const interval = rate === null ? null : wilson95(rate, row.sampleEff);
  const hasRange = speakable && row.holdQ10 !== null && row.holdQ50 !== null && row.holdQ90 !== null;
  // Holm 판정은 비용 뒤 비율로 났다 — 여기 숫자(비용 전)에서도 같은 쪽일 때만 말한다
  const sameSide =
    isCondition && rate !== null && usualRate !== null && row.differs !== null
      ? row.differs === "higher"
        ? outOf100(rate) > outOf100(usualRate)
        : outOf100(rate) < outOf100(usualRate)
      : false;
  return {
    condition: isCondition ? { id: row.conditionId, phrase: CONDITION_PHRASE[row.conditionId] ?? row.conditionId } : null,
    status: speakable ? "ok" : "below_min",
    sample: row.sample,
    sampleEffective: Math.round(row.sampleEff),
    sampleDays: row.sampleDays,
    upCount100: rate === null ? null : outOf100(rate),
    upRange: interval ? { low100: outOf100(interval.low), high100: outOf100(interval.high) } : null,
    range: hasRange ? { lowPct: pct(row.holdQ10!), midPct: pct(row.holdQ50!), highPct: pct(row.holdQ90!) } : null,
    usualUp100: usualRate === null ? null : outOf100(usualRate),
    differsFromUsual: sameSide ? row.differs : null,
    refPrice: price,
    invalidation: hasRange && price !== null && price > 0 ? priceLike(price * Math.exp(row.holdQ10!)) : null,
    asOf: row.asOf.toISOString(),
  };
};

const EMPTY: ScenarioBaseRate = {
  condition: null,
  status: "below_min",
  sample: 0,
  sampleEffective: 0,
  sampleDays: 0,
  upCount100: null,
  upRange: null,
  range: null,
  usualUp100: null,
  differsFromUsual: null,
  refPrice: null,
  invalidation: null,
  asOf: null,
};

export interface ScenarioBaseRateInput {
  /** 그 시장의 기저율 행 전부(조건 × 지평 + 평소 `ALL`) */
  stats: readonly BaseRateRow[];
  /** 지금 성립한 조건 — 우선순위 순(`matchConditions`) */
  matched: readonly string[];
  price: number | null;
}

interface Picked {
  tier: ScenarioTier;
  fallbackFrom: PanelHorizon | null;
  baseRate: ScenarioBaseRate;
}

/** 제 지평에서: 지금 조건 → 평소. 없으면 null */
const pickAt = (horizon: PanelHorizon, { stats, matched, price }: ScenarioBaseRateInput): Picked | null => {
  const days = BASE_RATE_HORIZON[horizon];
  if (days === null) return null;
  const at = (id: string) => stats.find((r) => r.conditionId === id && r.horizon === days);
  const usual = at("ALL");
  const condition = matched.map(at).find(usable);
  if (condition) return { tier: "now", fallbackFrom: null, baseRate: toBaseRate(condition, usual, price, true) };
  if (usable(usual)) return { tier: "usual", fallbackFrom: null, baseRate: toBaseRate(usual, usual, price, true) };
  return null;
};

/**
 * 지평 하나의 과거 실제 결과 — 늘 값을 돌려준다(빈 칸 0).
 * 결함 단은 가장 가까운 행의 표본만 싣는다("아직 n번뿐") — 비율 · 범위는 null
 */
export const scenarioBaseRate = (horizon: PanelHorizon, input: ScenarioBaseRateInput): Picked => {
  const own = pickAt(horizon, input);
  if (own) return own;
  for (const longer of PANEL_HORIZONS.slice(PANEL_HORIZONS.indexOf(horizon) + 1)) {
    const picked = pickAt(longer, input);
    if (picked) return { tier: "longer", fallbackFrom: longer, baseRate: picked.baseRate };
  }
  // 말할 수 있는 행이 어디에도 없다 — 표본이 가장 큰 행의 n 만
  const days = BASE_RATE_HORIZON[horizon] ?? 1;
  const near = input.stats
    .filter((r) => r.horizon === days && (r.conditionId === "ALL" || input.matched.includes(r.conditionId)))
    .sort((a, b) => b.sampleEff - a.sampleEff)[0];
  return {
    tier: "defect",
    fallbackFrom: null,
    baseRate: near ? toBaseRate(near, undefined, input.price, false) : { ...EMPTY, refPrice: input.price },
  };
};

/**
 * 지평 넷 — 모델이 화면 허가를 받은 칸(소유자 · `renderable`)만 `model`, 나머지는 과거 실제 결과.
 * `models` 는 소유자일 때만 넘긴다(아니면 null — 읽지도 않았다)
 */
export const toScenarioCells = (
  market: TradeCheckMarket,
  models: readonly ScenarioHorizonView[] | null,
  input: ScenarioBaseRateInput
): ScenarioCellView[] =>
  PANEL_HORIZONS.map((horizon) => {
    const model = models?.find((m) => m.horizon === horizon) ?? null;
    const horizonLabel = PANEL_HORIZON_LABEL[market][horizon];
    if (model?.renderable) {
      return { horizon, horizonLabel, source: "model", tier: "now", fallbackFrom: null, model, baseRate: null };
    }
    return { horizon, horizonLabel, source: "base_rate", model, ...scenarioBaseRate(horizon, input) };
  });
