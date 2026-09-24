/**
 * 가격 전망 카드 — F008 · `ADR-003` · `SRV-REQ-037`.
 *
 * `salt-forecast`(Python)가 쓴 `forecast.v_forecast_card` 한 행을 화면 계약으로 바꾼다. 숫자는
 * 전부 거기서 왔고 여기서는 **환산만** 한다 — 로그수익률 분위수 → 가격, 보유 수량 → 원화 손익 범위
 * (공통 수용 기준 3 "금액 계산은 서버").
 *
 * ## 두 게이트
 *
 * - **변동 범위**(방향 예측 아님): 보정 · 표본 · 신선도(`rangeRenderable`) + **전망 3종**이 전부 있을 때
 * - **방향**: 위 + 기준 모델을 이겼을 때(`renderable`)만. 아니면 방향 필드 자체가 없다
 *
 * ## 전망 3종 (ADR-003 §3) — 하나라도 없으면 범위를 싣지 않는다
 *
 * 채점 이력(표본 · 커버리지) · 기준 대비(기준 폭 · pinball 개선) · 빗나간 사례.
 * 적중률은 **혼자 나가지 않는다**(FEATURE-008 FR-10) — 커버리지는 폭 · 기준 폭과, 방향 적중은
 * 판정 수 · 기저율과 한 묶음이다.
 */

import { DomainError, ErrorKind } from "../../../shared/domain";
import type { CoachHolding } from "../model";

/** 소유자가 아니거나 전망이 없다 — 404. "막혔다"는 안내조차 주지 않는다(ADR-003). */
export class ForecastNotAvailableError extends DomainError {
  constructor() {
    super("COACH_FORECAST_NOT_AVAILABLE", ErrorKind.NotFound, "Forecast not available");
  }
}

export interface ForecastCardRow {
  horizonWeeks: number;
  asOf: Date | null;
  modelVersion: string;
  baseClose: number | null;
  /** 로그수익률 분위수 q05 · q10 · q25 · q50 · q75 · q90 · q95 */
  quantiles: [number, number, number, number, number, number, number] | null;
  pUp: number | null;
  direction: "up" | "down" | "abstain" | null;
  renderable: boolean;
  blockedReason: string | null;
  rangeRenderable: boolean;
  rangeBlockedReason: string | null;
  scoreKind: "backtest" | "live";
  sample: number;
  coverage90: number | null;
  width90: number | null;
  baselineWidth90: number | null;
  pinballSkill: number | null;
  pinballSkillCiLow: number | null;
  directionCalls: number;
  directionHits: number;
  directionBaseRate: number | null;
  recentMisses: { asOf: string; realized: number; q05: number; q95: number }[];
}

export type ForecastBlockedReason =
  | "insufficient_sample"
  | "stale_inputs"
  | "miscalibrated"
  | "no_live_prediction"
  | "failure_cases_missing"
  | "not_generated";

export interface ForecastPriceRange {
  low: number;
  lowerQuartile: number;
  median: number;
  upperQuartile: number;
  high: number;
  /** 90% 구간(하위 5% ~ 상위 95%)이라는 뜻. 화면 이름은 "변동 범위 (방향 예측 아님)" */
  coverage: 90;
}

export interface ForecastHoldingScenario {
  quantity: number;
  /** 기준가에서 이 주에 판다면 평가금액 변화 — 나쁠 때(하위 5%) · 중앙값 · 좋을 때(상위 95%) */
  valueChangeLow: number;
  valueChangeMedian: number;
  valueChangeHigh: number;
}

export interface ForecastTrackRecord {
  /** 라이브 52주 전에는 `backtest` — 화면이 라벨을 붙인다(FR-67) */
  kind: "backtest" | "live";
  sample: number;
  coverage90: number;
  /** 구간 폭(로그) — 모델과 기준. 넓혀서 맞히는 것을 숨기지 않는다 */
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
  /** 판정한 방향을 항상 찍었을 때의 적중률 — 방향 적중률은 이것과만 비교한다 */
  baseRate: number | null;
}

export interface ForecastHorizonView {
  horizonWeeks: number;
  renderable: boolean;
  blockedReason: ForecastBlockedReason | null;
  asOf: string | null;
  basePrice: number | null;
  range: ForecastPriceRange | null;
  scenario: ForecastHoldingScenario | null;
  trackRecord: ForecastTrackRecord | null;
  /** 방향 게이트가 열렸을 때만 있다 */
  direction?: ForecastDirection;
  modelVersion: string;
}

const KNOWN_RANGE_REASONS = new Set(["insufficient_sample", "stale_inputs", "miscalibrated", "no_live_prediction"]);

const price = (base: number, logReturn: number) => Math.round(base * Math.exp(logReturn));

const blocked = (row: ForecastCardRow, reason: ForecastBlockedReason): ForecastHorizonView => ({
  horizonWeeks: row.horizonWeeks,
  renderable: false,
  blockedReason: reason,
  asOf: row.asOf?.toISOString() ?? null,
  basePrice: null,
  range: null,
  scenario: null,
  trackRecord: null,
  modelVersion: row.modelVersion,
});

export const toForecastHorizon = (row: ForecastCardRow, holding: CoachHolding | null): ForecastHorizonView => {
  if (!row.rangeRenderable || !row.quantiles || row.baseClose === null || !row.asOf) {
    const reason = row.rangeBlockedReason ?? (row.asOf ? "insufficient_sample" : "no_live_prediction");
    return blocked(row, KNOWN_RANGE_REASONS.has(reason) ? (reason as ForecastBlockedReason) : "insufficient_sample");
  }
  if (row.coverage90 === null || row.width90 === null || row.baselineWidth90 === null || row.sample <= 0) {
    return blocked(row, "insufficient_sample");
  }
  if (row.recentMisses.length === 0) return blocked(row, "failure_cases_missing");

  const [q05, , q25, q50, q75, , q95] = row.quantiles;
  const base = row.baseClose;
  const range: ForecastPriceRange = {
    low: price(base, q05),
    lowerQuartile: price(base, q25),
    median: price(base, q50),
    upperQuartile: price(base, q75),
    high: price(base, q95),
    coverage: 90,
  };
  const quantity = holding?.totalQuantity ?? 0;
  const scenario: ForecastHoldingScenario | null =
    quantity > 0
      ? {
          quantity,
          valueChangeLow: Math.round(quantity * (range.low - base)),
          valueChangeMedian: Math.round(quantity * (range.median - base)),
          valueChangeHigh: Math.round(quantity * (range.high - base)),
        }
      : null;

  const view: ForecastHorizonView = {
    horizonWeeks: row.horizonWeeks,
    renderable: true,
    blockedReason: null,
    asOf: row.asOf.toISOString(),
    basePrice: Math.round(base),
    range,
    scenario,
    trackRecord: {
      kind: row.scoreKind,
      sample: row.sample,
      coverage90: row.coverage90,
      width90: row.width90,
      baselineWidth90: row.baselineWidth90,
      pinballSkill: row.pinballSkill,
      misses: row.recentMisses.map((m) => ({
        asOf: m.asOf,
        realizedReturn: Math.expm1(m.realized),
        lowReturn: Math.expm1(m.q05),
        highReturn: Math.expm1(m.q95),
      })),
    },
    modelVersion: row.modelVersion,
  };
  if (row.renderable && row.pUp !== null && row.direction) {
    view.direction = {
      upProbability: row.pUp,
      direction: row.direction,
      calls: row.directionCalls,
      hits: row.directionHits,
      baseRate: row.directionBaseRate,
    };
  }
  return view;
};

/** 전망 대상자인가 — 서버 설정의 이메일 목록(소문자 비교). 비면 아무도 아니다(ADR-003 §5 되돌리기). */
export const isForecastOwner = (email: string | undefined, owners: readonly string[]): boolean =>
  !!email && owners.some((owner) => owner.trim().toLowerCase() === email.trim().toLowerCase());
