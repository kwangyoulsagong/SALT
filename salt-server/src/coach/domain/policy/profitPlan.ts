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
}

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

export const calculateProfitPlan = ({
  currentPrice,
  averageBuyPrice,
  unrealizedProfitRate,
}: ProfitPlanInput): ProfitPlanCalculation => {
  // 원문: `holding.currentPrice || holding.averageBuyPrice` — 0 도 평균가로 대체된다
  const price = currentPrice || averageBuyPrice;

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
    stages: [
      {
        key: ProfitPlanStageKey.ProtectLoss,
        label: "손실 제한",
        price: Number(stopPrice.toFixed(2)),
        action: ProfitPlanStageAction.StopLossReview,
        ratio: 0.25,
      },
      {
        key: ProfitPlanStageKey.FirstProfit,
        label: "1차 익절 검토",
        price: Number(firstTakeProfit.toFixed(2)),
        action: ProfitPlanStageAction.TakeProfitReview,
        ratio: 0.25,
      },
      {
        key: ProfitPlanStageKey.TrendHold,
        label: "추세 유지 구간",
        price: Number(secondTakeProfit.toFixed(2)),
        action: ProfitPlanStageAction.HoldOrTrailStop,
        ratio: 0.5,
      },
    ],
  };
};

/**
 * 경고 문구.
 *
 * **2인칭 인격 평가를 하지 않는다**(전 영역 공통 수용 기준) — 원문도 행동 서술이고
 * 그대로 유지했다. 확신 표현·목표주가도 없다.
 */
export const buildProfitPlanWarnings = (profitRate: number): string[] => {
  const warnings: string[] = [];
  if (profitRate >= THRESHOLD.takeProfitReviewFrom) {
    warnings.push("수익 중인 종목은 전량 매도보다 단계형 익절을 검토하세요.");
  }
  if (profitRate <= THRESHOLD.stopLossReviewAt) {
    warnings.push(
      "손실 중인 종목은 물타기보다 최초 투자 논리 훼손 여부를 먼저 확인하세요."
    );
  }
  if (!warnings.length) {
    warnings.push("현재는 계획 유지와 다음 점검 가격 확인이 우선입니다.");
  }
  return warnings;
};
