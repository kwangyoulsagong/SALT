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
  maxLossAmount: number | null;
  maxLossRate: number | null;
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

export const calculatePreflight = (input: PreflightInput): PreflightCalculation => {
  const projectedTotalValue = input.totalValue + input.amount;
  const projectedSymbolValue = input.existingSymbolValue + input.amount;

  // 원문: 분모가 0 이면 비중을 1 로 본다 — 첫 진입이 전량이라는 뜻이다
  const projectedWeight =
    projectedTotalValue > 0 ? projectedSymbolValue / projectedTotalValue : 1;

  const stopLossRate = input.stopPrice
    ? Math.max(0, (input.entryPrice - input.stopPrice) / input.entryPrice)
    : null;

  const maxLossAmount =
    stopLossRate === null ? null : input.amount * stopLossRate;

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

  if (!input.stopPrice) {
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
    projectedWeight,
    projectedTotalValue,
    projectedSymbolValue,
    stopLossRate,
    stalePrice,
    warnings,
    checklist: [
      {
        key: PreflightCheckKey.StopPrice,
        passed: Boolean(input.stopPrice),
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
