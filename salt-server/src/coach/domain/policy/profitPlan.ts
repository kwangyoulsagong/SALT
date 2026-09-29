/**
 * 익절·손절 단계 계획 — `profit-plan` 에서 옮겨온 **순수 계산**.
 *
 * ## 산술을 그대로 보존했다
 *
 * `Money`(Decimal) 로 바꾸지 않았다. 이 단계의 목적은 **현재 동작을 고정하는 것**이고
 * (NFR 정정 — 특성화 테스트), 산술을 바꾸면서 옮기면 무엇이 원인인지 알 수 없다.
 * `Number(x.toFixed(2))` 반올림도 원문 그대로다.
 *
 * > **다음 단계에서 `Money` 로 바꾼다.** 특성화 테스트가 있으므로 그때 값이 달라지는지
 * > 즉시 보인다. 달라지면 그것 자체가 판단해야 할 사실이다 — 조용히 바뀌지 않는다.
 *
 * 이 파일은 `domain` 이므로 Prisma·Express·Zod 를 모른다. 입력은 평범한 숫자다.
 */

import Decimal from "decimal.js";

/** 계획 상태. 문자열 리터럴 union 을 쓰지 않는다. */
export enum ProfitPlanStatus {
  TakeProfitReview = "take_profit_review",
  StopLossReview = "stop_loss_review",
  RaiseStopReview = "raise_stop_review",
  HoldPlan = "hold_plan",
}

export enum ProfitPlanStageKey {
  ProtectLoss = "protect_loss",
  FirstProfit = "first_profit",
  TrendHold = "trend_hold",
}

export enum ProfitPlanStageAction {
  StopLossReview = "stop_loss_review",
  TakeProfitReview = "take_profit_review",
  HoldOrTrailStop = "hold_or_trail_stop",
}

/** 계산에 필요한 보유 정보만. Aggregate 를 받지 않는다. */
export interface ProfitPlanInput {
  currentPrice: number;
  averageBuyPrice: number;
  unrealizedProfitRate: number;
}

/**
 * 가격선의 근거. `volatility` = 종목 실현 변동성 배수(F010 슬라이스 2 · 사전등록 `regime-gate@1` [stops]),
 * `fixed` = 변동성이 없거나 막혀서 예전 고정 비율(×0.92 · ×1.12 · ×1.25)을 쓴 것. 화면이 둘을 구분한다.
 */
export enum ProfitPlanBasis {
  Volatility = "volatility",
  Fixed = "fixed",
}

export interface ProfitPlanStage {
  key: ProfitPlanStageKey;
  label: string;
  price: number;
  action: ProfitPlanStageAction;
  ratio: number;
}

export interface ProfitPlanCalculation {
  status: ProfitPlanStatus;
  currentPrice: number;
  stages: ProfitPlanStage[];
  basis: ProfitPlanBasis;
  /** 가격선 폭 1σ(로그수익률, 20일). `fixed` 면 `null` */
  sigmaHorizon: number | null;
}

/**
 * 변동성 계획 — 삼중 장벽 라벨(salt-forecast `domain/labels.py`)과 **같은 정의**다. 손절 −1σ · 1차 익절 +2σ,
 * 추세 유지 +3σ, σ_h = 연율 σ × √(20/365). 백테스트 기록은 `salt-forecast/reports/regime-gate-*.md`
 * "손절 · 익절 도달" — 고정 비율은 20일 안 94% 가 어느 한쪽에 닿는다(알트 변동성에선 잡음).
 *
 * 상태 문턱도 σ 단위다 — 고정 계획의 −8% · +8% · +20% 를 −1σ · +1σ · +2σ 로.
 */
export const VOLATILITY_PLAN = {
  horizonDays: 20,
  annualDays: 365,
  stop: 1,
  firstProfit: 2,
  trendHold: 3,
} as const;

/** 임계값은 원문의 상수다. 세법·정책 값이 아니라 이 기능의 규칙이다. */
const THRESHOLD = {
  /** 이 수익률을 넘으면 손절선을 현재가 기준으로 올린다 */
  trailStopFrom: 10,
  /** 이 수익률을 넘으면 1차 익절을 현재가로 본다 */
  firstProfitAtCurrentFrom: 15,
  takeProfitReviewFrom: 20,
  stopLossReviewAt: -8,
  raiseStopReviewFrom: 8,
} as const;

const RATIO = {
  stopLoss: 0.94,
  stopLossFromAverage: 0.92,
  firstProfitFromAverage: 1.12,
  secondProfitFromAverage: 1.25,
} as const;

const resolveStatus = (profitRate: number): ProfitPlanStatus => {
  if (profitRate >= THRESHOLD.takeProfitReviewFrom) {
    return ProfitPlanStatus.TakeProfitReview;
  }
  if (profitRate <= THRESHOLD.stopLossReviewAt) {
    return ProfitPlanStatus.StopLossReview;
  }
  if (profitRate >= THRESHOLD.raiseStopReviewFrom) {
    return ProfitPlanStatus.RaiseStopReview;
  }
  return ProfitPlanStatus.HoldPlan;
};

const stagesAt = (stop: number, first: number, trend: number): ProfitPlanStage[] => [
  {
    key: ProfitPlanStageKey.ProtectLoss,
    label: "손실 제한",
    price: Number(stop.toFixed(2)),
    action: ProfitPlanStageAction.StopLossReview,
    ratio: 0.25,
  },
  {
    key: ProfitPlanStageKey.FirstProfit,
    label: "1차 익절 검토",
    price: Number(first.toFixed(2)),
    action: ProfitPlanStageAction.TakeProfitReview,
    ratio: 0.25,
  },
  {
    key: ProfitPlanStageKey.TrendHold,
    label: "추세 유지 구간",
    price: Number(trend.toFixed(2)),
    action: ProfitPlanStageAction.HoldOrTrailStop,
    ratio: 0.5,
  },
];

/** 연율 변동성 → 20일 로그 폭. 양수 유한값이 아니면 `null`(고정 계획으로) */
export const horizonSigma = (annualized: number | null | undefined): number | null => {
  if (annualized === null || annualized === undefined) return null;
  if (!(annualized > 0) || !Number.isFinite(annualized)) return null;
  return annualized * Math.sqrt(VOLATILITY_PLAN.horizonDays / VOLATILITY_PLAN.annualDays);
};

const volatilityStatus = (gain: number, sigma: number): ProfitPlanStatus => {
  if (gain >= VOLATILITY_PLAN.firstProfit * sigma) return ProfitPlanStatus.TakeProfitReview;
  if (gain <= -VOLATILITY_PLAN.stop * sigma) return ProfitPlanStatus.StopLossReview;
  if (gain >= VOLATILITY_PLAN.stop * sigma) return ProfitPlanStatus.RaiseStopReview;
  return ProfitPlanStatus.HoldPlan;
};

const volatilityPlan = (price: number, average: number, sigma: number): ProfitPlanCalculation => {
  const fromAverage = (k: number) => average * Math.exp(k * sigma);
  // 평단 대비 로그 수익 — σ 단위로 상태 · 손절 올리기를 가른다
  const gain = price > 0 ? Math.log(price / average) : 0;
  const stop =
    gain >= VOLATILITY_PLAN.stop * sigma
      ? price * Math.exp(-VOLATILITY_PLAN.stop * sigma)
      : fromAverage(-VOLATILITY_PLAN.stop);
  const first =
    gain >= VOLATILITY_PLAN.firstProfit * sigma ? price : fromAverage(VOLATILITY_PLAN.firstProfit);

  return {
    status: volatilityStatus(gain, sigma),
    currentPrice: price,
    stages: stagesAt(stop, first, fromAverage(VOLATILITY_PLAN.trendHold)),
    basis: ProfitPlanBasis.Volatility,
    sigmaHorizon: sigma,
  };
};

/**
 * `annualizedVolatility`(연율, 0.52 = 52%)가 있으면 변동성 계획, 없으면 예전 고정 계획. 고정 계획은 산술을
 * 그대로 뒀다(특성화 테스트) — 변동성이 막힌 종목의 숫자가 조용히 바뀌지 않게.
 */
export const calculateProfitPlan = (
  { currentPrice, averageBuyPrice, unrealizedProfitRate }: ProfitPlanInput,
  annualizedVolatility: number | null = null
): ProfitPlanCalculation => {
  // 원문: `holding.currentPrice || holding.averageBuyPrice` — 0 도 평균가로 대체된다
  const price = currentPrice || averageBuyPrice;
  const sigma = horizonSigma(annualizedVolatility);
  if (sigma !== null && averageBuyPrice > 0) {
    return volatilityPlan(price, averageBuyPrice, sigma);
  }

  const stopPrice =
    unrealizedProfitRate > THRESHOLD.trailStopFrom
      ? price * RATIO.stopLoss
      : averageBuyPrice * RATIO.stopLossFromAverage;

  const firstTakeProfit =
    unrealizedProfitRate >= THRESHOLD.firstProfitAtCurrentFrom
      ? price
      : averageBuyPrice * RATIO.firstProfitFromAverage;

  const secondTakeProfit = averageBuyPrice * RATIO.secondProfitFromAverage;

  return {
    status: resolveStatus(unrealizedProfitRate),
    currentPrice: price,
    stages: stagesAt(stopPrice, firstTakeProfit, secondTakeProfit),
    basis: ProfitPlanBasis.Fixed,
    sigmaHorizon: null,
  };
};

/**
 * 현재가와 가격선의 차이 — `price − currentPrice`. 위에 있으면 양수, 호가 통화 금액이다.
 *
 * **% 를 만들지 않는다**(D13) — 거리 % 는 수익률로 읽힌다. 뺄셈 잡음
 * (`0.30000000000000004`)이 금액에 남지 않게 `Decimal` 로 뺀다. 익절 계획 화면과
 * 스마트 바이존이 **같은 함수**를 쓴다 — 두 화면이 다른 거리를 말하지 않는다.
 */
export const priceGap = (price: number, currentPrice: number): number =>
  new Decimal(price).minus(currentPrice).toNumber();

/**
 * 경고 문구 — 계획 상태에서 나온다(상태 문턱이 고정 % 이든 σ 이든 같은 문구).
 *
 * **2인칭 인격 평가를 하지 않는다**(전 영역 공통 수용 기준) — 원문도 행동 서술이고
 * 그대로 유지했다. 확신 표현·목표주가도 없다.
 */
export const buildProfitPlanWarnings = (status: ProfitPlanStatus): string[] => {
  if (status === ProfitPlanStatus.TakeProfitReview) {
    return ["수익 중인 종목 — 전량 매도보다 단계형 익절이 흔히 쓰이는 방식입니다."];
  }
  if (status === ProfitPlanStatus.StopLossReview) {
    return ["손실 중인 종목은 물타기보다 최초 투자 논리 훼손 여부를 먼저 확인하세요."];
  }
  return ["현재는 계획 유지와 다음 점검 가격 확인이 우선입니다."];
};
