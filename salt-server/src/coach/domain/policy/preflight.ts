/**
 * 주문 전 계산 — `trade-preflight` 에서 옮겨온 **순수 계산**.
 *
 * ## 이 제품의 제약이 여기 걸린다
 *
 * **주문을 실행하는 코드 경로가 없다**(전 영역 공통 수용 기준). 이 정책은 손익비·비중·
 * 최대손실을 **계산해 보여주기만** 하고, 게이트·차단·주문 동작이 없다.
 * `orderExecution: false` 는 응답의 사실 서술이지 스위치가 아니다.
 *
 * ## 산술을 그대로 보존했다
 *
 * `Money`(Decimal) 로 바꾸지 않았다 — `profitPlan.ts` 와 같은 이유다(특성화 우선).
 * `Number((rewardRate / stopLossRate).toFixed(2))` 반올림도 원문 그대로다.
 */

export enum PreflightMode {
  Scalp = "scalp",
  LongTerm = "long_term",
}

export enum PreflightSeverity {
  Info = "info",
  Warning = "warning",
  Danger = "danger",
}

export enum PreflightWarningCode {
  MissingStopPrice = "missing_stop_price",
  WeakRiskReward = "weak_risk_reward",
  ConcentrationRisk = "concentration_risk",
  StalePrice = "stale_price",
}

export enum PreflightCheckKey {
  StopPrice = "stop_price",
  RiskReward = "risk_reward",
  Concentration = "concentration",
}

export interface PreflightInput {
  entryPrice: number;
  stopPrice?: number;
  /**
   * 손절 비율 — **음수 소수**(−1.5% → `-0.015`). 화면의 손절 칩이 보낸다(`SRV-REQ-025` FR-52).
   * `stopPrice` 가 있으면 그것이 이긴다. 가격 환산은 여기서 한다 — 프론트가 하면 공통 수용
   * 기준 3("금액 계산은 서버") 위반이다.
   */
  stopLossRate?: number;
  takeProfitPrices: number[];
  amount: number;
  mode: PreflightMode;
  /** 전체 보유 평가금액 합 */
  totalValue: number;
  /** 이 종목의 기존 평가금액 */
  existingSymbolValue: number;
  /** 사용자 프로필의 단일 자산 비중 한도. 없으면 기본값 */
  maxSingleAssetWeight: number;
  /** 시세 갱신 시각. 없으면 신선도 판정을 하지 않는다 */
  priceUpdatedAt: Date | null;
  /** 지금 시각 — 주입한다. 도메인이 `Date.now()` 를 부르면 테스트가 시간에 묶인다 */
  now: Date;
}

export interface PreflightWarning {
  code: PreflightWarningCode;
  severity: PreflightSeverity;
  message: string;
}

export interface PreflightCheck {
  key: PreflightCheckKey;
  passed: boolean;
  label: string;
}

export interface PreflightCalculation {
  riskRewardRatio: number | null;
  /** 원 단위 정수(`SRV-REQ-025` FR-19) */
  maxLossAmount: number | null;
  maxLossRate: number | null;
  /**
   * 총자산 대비 최대 손실 — `maxLossAmount / 진입 후 총 평가금액`. `maxLossRate` 와 **같은 값**이다.
   * 화면 계약(FR-52)이 뜻이 드러나는 이름을 요구했고, 기존 이름은 하위 호환으로 남긴다.
   */
  maxLossOfTotalRate: number | null;
  /** 실제로 쓴 손절가 — 입력 `stopPrice`, 없으면 `stopLossRate` 로 환산한 값 */
  effectiveStopPrice: number | null;
  projectedWeight: number;
  projectedTotalValue: number;
  projectedSymbolValue: number;
  stopLossRate: number | null;
  warnings: PreflightWarning[];
  checklist: PreflightCheck[];
  stalePrice: boolean;
}

/** 손익비 최소 기준. 이 기능의 규칙이다. */
export const MIN_RISK_REWARD_RATIO = 1.5;
/** 프로필에 값이 없을 때의 단일 자산 비중 한도. */
export const DEFAULT_MAX_SINGLE_ASSET_WEIGHT = 0.6;
/** 이 시간을 넘게 갱신되지 않은 시세는 오래된 것으로 본다. */
const STALE_PRICE_MS = 10 * 60 * 1000;

/** `stopPrice` 우선, 없으면 `entryPrice × (1 + stopLossRate)`. 둘 다 없으면 `null` */
export const resolveStopPrice = (
  input: Pick<PreflightInput, "entryPrice" | "stopPrice" | "stopLossRate">
): number | null => {
  if (input.stopPrice) return input.stopPrice;
  if (input.stopLossRate === undefined || input.stopLossRate >= 0) return null;
  return input.entryPrice * (1 + input.stopLossRate);
};

export const calculatePreflight = (input: PreflightInput): PreflightCalculation => {
  const projectedTotalValue = input.totalValue + input.amount;
  const projectedSymbolValue = input.existingSymbolValue + input.amount;

  // 원문: 분모가 0 이면 비중을 1 로 본다 — 첫 진입이 전량이라는 뜻이다
  const projectedWeight =
    projectedTotalValue > 0 ? projectedSymbolValue / projectedTotalValue : 1;

  const effectiveStopPrice = resolveStopPrice(input);

  const stopLossRate = effectiveStopPrice
    ? Math.max(0, (input.entryPrice - effectiveStopPrice) / input.entryPrice)
    : null;

  const maxLossAmount =
    stopLossRate === null ? null : Math.round(input.amount * stopLossRate);

  const maxLossRate =
    projectedTotalValue > 0 && maxLossAmount !== null
      ? maxLossAmount / projectedTotalValue
      : null;

  const primaryTakeProfit = input.takeProfitPrices[0];
  const rewardRate = primaryTakeProfit
    ? Math.max(0, (primaryTakeProfit - input.entryPrice) / input.entryPrice)
    : null;

  const riskRewardRatio =
    rewardRate !== null && stopLossRate && stopLossRate > 0
      ? Number((rewardRate / stopLossRate).toFixed(2))
      : null;

  const stalePrice = Boolean(
    input.priceUpdatedAt &&
      input.now.getTime() - input.priceUpdatedAt.getTime() > STALE_PRICE_MS
  );

  const warnings: PreflightWarning[] = [];

  if (!effectiveStopPrice) {
    warnings.push({
      code: PreflightWarningCode.MissingStopPrice,
      severity:
        input.mode === PreflightMode.Scalp
          ? PreflightSeverity.Danger
          : PreflightSeverity.Warning,
      message: "손절 기준이 없어 최대 손실을 계산할 수 없습니다.",
    });
  }

  if (riskRewardRatio !== null && riskRewardRatio < MIN_RISK_REWARD_RATIO) {
    warnings.push({
      code: PreflightWarningCode.WeakRiskReward,
      severity: PreflightSeverity.Warning,
      message: "기대 손익비가 낮습니다. 진입 조건을 다시 검토하세요.",
    });
  }

  if (projectedWeight > input.maxSingleAssetWeight) {
    warnings.push({
      code: PreflightWarningCode.ConcentrationRisk,
      severity: PreflightSeverity.Danger,
      message: "추가 진입 후 단일 자산 비중 한도를 초과합니다.",
    });
  }

  if (stalePrice) {
    warnings.push({
      code: PreflightWarningCode.StalePrice,
      severity: PreflightSeverity.Warning,
      message: "시장 가격 업데이트가 지연되어 있습니다.",
    });
  }

  return {
    riskRewardRatio,
    maxLossAmount,
    maxLossRate,
    maxLossOfTotalRate: maxLossRate,
    effectiveStopPrice,
    projectedWeight,
    projectedTotalValue,
    projectedSymbolValue,
    stopLossRate,
    stalePrice,
    warnings,
    checklist: [
      {
        key: PreflightCheckKey.StopPrice,
        passed: Boolean(effectiveStopPrice),
        label: "손절 기준을 정했는가",
      },
      {
        key: PreflightCheckKey.RiskReward,
        passed:
          riskRewardRatio !== null && riskRewardRatio >= MIN_RISK_REWARD_RATIO,
        label: "손익비가 최소 기준을 넘는가",
      },
      {
        key: PreflightCheckKey.Concentration,
        passed: projectedWeight <= input.maxSingleAssetWeight,
        label: "단일 자산 비중 한도 안인가",
      },
    ],
  };
};
