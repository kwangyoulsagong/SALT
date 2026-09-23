import type { CoachMode } from "../model";
import { calculateProfitPlan, priceGap, type ProfitPlanInput } from "./profitPlan";

/**
 * 스마트 바이존 — **보유 = 내 규칙 가격, 미보유 = 관찰 구간** (F004 · 감사 문서 D2).
 *
 * ## 가격 목표가 아니다
 *
 * 옛 매수존은 "매수 적정가"와 예상 수익률을 냈다. 공통 수용 기준 4(목표주가 · 수익률
 * 예측 0건)에 걸려 되살리지 않는다. 여기 있는 가격은 둘 중 하나다:
 *
 * - **보유**: 사용자가 이미 가진 규칙(`calculateProfitPlan`)이 가리키는 가격. 계산식은
 *   익절 계획 화면과 **같은 함수**다 — 두 화면이 다른 손절선을 말하지 않는다
 * - **미보유**: 지난 가격이 어디에 많이 머물렀는지(백분위). 앞으로 갈 곳이 아니다
 *
 * 현재가와의 거리는 **금액**(`priceGap`)뿐이다. 거리 % 는 수익률로 읽혀서 만들지 않는다(D13).
 */

export type ZoneTimeframe = "m5" | "d1";

export interface ObservationRule {
  ruleCode: string;
  timeframe: ZoneTimeframe;
  days: number;
  /**
   * 이 수 미만이면 구간을 내지 않는다. **기대 캔들 수의 절반**이다 — 단타 24시간 5분봉
   * 288개 · 장기 1년 일봉 365개. 상장 직후 종목의 몇십 개 캔들로 만든 "1년 분포"는
   * 1년 분포가 아니다.
   */
  minSample: number;
}

/** 관찰 구간 규칙 (B31 — 20 · 50 · 80 백분위). */
export const OBSERVATION_RULE: Record<CoachMode, ObservationRule> = {
  scalp: {
    ruleCode: "close_p20_p50_p80_m5_24h",
    timeframe: "m5",
    days: 1,
    minSample: 144,
  },
  long_term: {
    ruleCode: "close_p20_p50_p80_d1_1y",
    timeframe: "d1",
    days: 365,
    minSample: 183,
  },
};

export const OBSERVATION_FRACTIONS = [0.2, 0.5, 0.8];

export type HeldRuleStageKey = "protect_loss" | "first_profit" | "trend_hold";

export interface HeldRuleZone {
  kind: "held_rule";
  notPrediction: true;
  currentPrice: number;
  stages: Array<{
    key: HeldRuleStageKey;
    price: number;
    /** `price − currentPrice`. 위에 있으면 양수. 호가 통화 금액이다. */
    priceGap: number;
    ratio: number;
  }>;
  status: string;
}

export interface ObservationZone {
  kind: "observation";
  notPrediction: true;
  currentPrice: number;
  lower: number;
  mid: number;
  upper: number;
  priceGap: { lower: number; mid: number; upper: number };
  ruleCode: string;
  lookback: { timeframe: ZoneTimeframe; days: number };
  sample: number;
}

export type ZoneUnavailableReason =
  | "out_of_scope"
  | "excluded_asset"
  | "insufficient_price_history";

export interface UnavailableZone {
  kind: "unavailable";
  reasonCode: ZoneUnavailableReason;
}

export type Zone = HeldRuleZone | ObservationZone | UnavailableZone;

export const heldRuleZone = (holding: ProfitPlanInput): HeldRuleZone => {
  const plan = calculateProfitPlan(holding);

  return {
    kind: "held_rule",
    notPrediction: true,
    currentPrice: plan.currentPrice,
    stages: plan.stages.map((stage) => ({
      key: stage.key as HeldRuleStageKey,
      price: stage.price,
      priceGap: priceGap(stage.price, plan.currentPrice),
      ratio: stage.ratio,
    })),
    status: plan.status,
  };
};

export interface CloseDistribution {
  sample: number;
  /** `OBSERVATION_FRACTIONS` 순서. 행이 없으면 `null`. */
  values: number[] | null;
}

export const observationZone = (
  mode: CoachMode,
  currentPrice: number,
  distribution: CloseDistribution
): ObservationZone | UnavailableZone => {
  const rule = OBSERVATION_RULE[mode];
  const values = distribution.values;

  if (
    distribution.sample < rule.minSample ||
    !values ||
    values.length !== OBSERVATION_FRACTIONS.length
  ) {
    return { kind: "unavailable", reasonCode: "insufficient_price_history" };
  }

  // 백분위는 단조라 정렬이 필요 없다. 그래도 계약(`lower ≤ mid ≤ upper`)을 여기서 못 박는다
  const [lower, mid, upper] = [...values].sort((a, b) => a - b);

  return {
    kind: "observation",
    notPrediction: true,
    currentPrice,
    lower,
    mid,
    upper,
    priceGap: {
      lower: priceGap(lower, currentPrice),
      mid: priceGap(mid, currentPrice),
      upper: priceGap(upper, currentPrice),
    },
    ruleCode: rule.ruleCode,
    lookback: { timeframe: rule.timeframe, days: rule.days },
    sample: distribution.sample,
  };
};
