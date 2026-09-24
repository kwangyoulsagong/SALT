/**
 * 포지션 사이즈 계산 — FEATURE-009 FR-4~8 (`SRV-REQ-038`).
 *
 * ## `preflight.ts` 와 무엇이 다른가
 *
 * `preflight` 는 **금액**(얼마어치)을 받아 손익비 · 비중을 보는 특성화 이관 코드이고 `number` 산술이다.
 * 이것은 **수량 · 손절가**를 받아 "이 크기가 **내 예산**에서 몇 % 인가"를 본다. 예산(`riskBudget`)과
 * 변동성 타깃이 들어오고, 금액은 전부 `Money`(Decimal) 를 지난다(FR-8). 둘을 합치면 특성화 테스트가
 * 고정한 반올림을 바꾸게 된다 — 그래서 나란히 둔다.
 *
 * ## 계산만 한다
 *
 * 결과는 숫자와 상태 코드뿐이다. "줄이세요" 같은 지시 · 차단 · 게이트가 없다(공통 수용 기준 2 · 4,
 * 2026-09-08 통제 없음 결정). 참고 수량 · 참고 비중은 **두 숫자를 나란히** 둘 뿐이다.
 *
 * ## 못 구하는 값은 `null` + 사유
 *
 * 손절가가 없거나 예산을 정하지 않았으면 그 값만 `null` 이고 `unavailable` 에 사유가 붙는다.
 * 0 이나 기본값으로 채우지 않는다(FR-2 · 수용 기준 "0 · 기본값 표시 0건").
 */

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";

/** 한쪽 거래 수수료율 — 업비트 KRW 마켓 일반 수수료. 손실 계산에 진입 · 청산 두 번 들어간다 */
export const SIZING_FEE_RATE_PER_SIDE = new Decimal("0.0005");
/** FR-7 — "이 크기로 N번 연속 손절이면" */
export const CONSECUTIVE_LOSS_COUNT = 5;
/** 목표 연 변동성을 정하지 않았을 때(FR-1 "기본 15%"). 응답에 기본값이라고 밝힌다 */
export const DEFAULT_TARGET_VOLATILITY = new Decimal("0.15");

export type SizingStatus =
  | "ok"
  /** 손절가가 진입가 이상 — 손실 크기가 정의되지 않는다(FR-4) */
  | "stop_not_below_entry"
  /** 매도는 손실 크기 계산 대상이 아니다. 비중만 준다 */
  | "sell_side";

export type SizingUnavailableReason =
  | "stop_price_missing"
  | "stop_not_below_entry"
  | "budget_not_set"
  | "no_portfolio_value"
  | "monthly_budget_exhausted"
  | "insufficient_data"
  | "not_applicable_sell";

export type ReferenceQuantityLimit = "per_trade_budget" | "single_asset_weight";

export interface SizingInput {
  side: "buy" | "sell";
  quantity: Decimal;
  price: Money;
  stopPrice: Money | null;
  /** 원으로 환산된 1회 예산. 정하지 않았으면 `null` */
  perTradeBudget: Money | null;
  /** 월 예산(원). 정하지 않았으면 `null` */
  monthlyBudget: Money | null;
  /** 이번 달 이미 쓴 손실(원, 0 이상). 계산 불가면 `null` */
  monthlyUsed: Money | null;
  /** 코인 보유 평가금액 합(원) */
  totalValue: Money;
  /** 이 종목 기존 평가금액(원) */
  existingSymbolValue: Money;
  maxSingleAssetWeight: Decimal;
  /** 종목 실현 변동성(연율). `forecast.realized_vol` 이 없으면 `null` */
  realizedVolatility: Decimal | null;
  targetVolatility: Decimal;
  /** FR-6 — 사용자가 적은 승률 · 손익비. 없으면 켈리 섹션이 없다 */
  kelly?: { winRate: Decimal; payoffRatio: Decimal };
}

export interface KellyResult {
  /** f* = W − (1 − W) / R. 음수면 엣지가 없다는 뜻이고 그대로 준다 */
  full: Decimal;
  half: Decimal;
  quarter: Decimal;
  hasEdge: boolean;
}

export interface SizingResult {
  status: SizingStatus;
  /** 단위당 최대 손실 = (진입가 − 손절가) + 양쪽 수수료 */
  lossPerUnit: Money | null;
  maxLoss: Money | null;
  /** 최대 손실 ÷ 1회 예산 */
  perTradeBudgetRatio: Decimal | null;
  /** 최대 손실 ÷ 월 예산 잔여 */
  monthlyBudgetRemainingRatio: Decimal | null;
  monthlyBudgetRemaining: Money | null;
  referenceMaxQuantity: { value: Decimal; limitedBy: ReferenceQuantityLimit } | null;
  /** 목표 변동성 ÷ 실현 변동성, 최대 1 */
  volTargetWeight: Decimal | null;
  currentWeight: Decimal | null;
  /** 이 거래 뒤 비중 */
  projectedWeight: Decimal | null;
  consecutiveLoss: { count: number; amount: Money; monthlyBudgetRatio: Decimal | null } | null;
  kelly: KellyResult | null;
  unavailable: Partial<Record<SizingField, SizingUnavailableReason>>;
}

export type SizingField =
  | "maxLoss"
  | "perTradeBudgetRatio"
  | "monthlyBudgetRemainingRatio"
  | "referenceMaxQuantity"
  | "volTargetWeight"
  | "currentWeight"
  | "consecutiveLoss";

const ratio = (numerator: Money, denominator: Money): Decimal =>
  numerator.toDecimal().div(denominator.toDecimal());

/**
 * 한 종목 상한 안에서 더 살 수 있는 수량.
 * (E + q·p) / (T + q·p) ≤ w  →  q ≤ (w·T − E) / (p·(1 − w)). 음수면 0.
 * w ≥ 1 이면 상한이 없다(`null`).
 */
export const weightCapQuantity = (
  weight: Decimal,
  total: Money,
  existing: Money,
  price: Money
): Decimal | null => {
  if (weight.gte(1)) return null;
  const room = weight.times(total.toDecimal()).minus(existing.toDecimal());
  if (room.lte(0)) return new Decimal(0);
  return room.div(price.toDecimal().times(new Decimal(1).minus(weight)));
};

export const kellyFraction = (winRate: Decimal, payoffRatio: Decimal): KellyResult => {
  const full = winRate.minus(new Decimal(1).minus(winRate).div(payoffRatio));
  return {
    full,
    half: full.div(2),
    quarter: full.div(4),
    hasEdge: full.gt(0),
  };
};

export const calculateSizing = (input: SizingInput): SizingResult => {
  const unavailable: SizingResult["unavailable"] = {};
  const notional = input.price.scale(input.quantity);

  const currentWeight = input.totalValue.isZero()
    ? null
    : ratio(input.existingSymbolValue, input.totalValue);
  if (currentWeight === null) unavailable.currentWeight = "no_portfolio_value";

  const projectedTotal =
    input.side === "buy" ? input.totalValue.plus(notional) : input.totalValue.minus(notional);
  const projectedSymbol =
    input.side === "buy"
      ? input.existingSymbolValue.plus(notional)
      : input.existingSymbolValue.minus(notional);
  // 보유보다 많이 파는 입력은 여기서 막지 않는다 — 거래 기록이 막는다. 비중만 0 에서 자른다
  const projectedWeight =
    projectedTotal.toDecimal().lte(0)
      ? null
      : Decimal.max(0, ratio(projectedSymbol, projectedTotal));

  const volTargetWeight =
    input.realizedVolatility && input.realizedVolatility.gt(0)
      ? Decimal.min(1, input.targetVolatility.div(input.realizedVolatility))
      : null;
  if (volTargetWeight === null) unavailable.volTargetWeight = "insufficient_data";

  const monthlyBudgetRemaining =
    input.monthlyBudget && input.monthlyUsed
      ? input.monthlyBudget.minus(input.monthlyUsed)
      : null;

  const base = {
    currentWeight,
    projectedWeight,
    volTargetWeight,
    monthlyBudgetRemaining,
  };

  if (input.side === "sell") {
    for (const field of [
      "maxLoss",
      "perTradeBudgetRatio",
      "monthlyBudgetRemainingRatio",
      "referenceMaxQuantity",
      "consecutiveLoss",
    ] as const) {
      unavailable[field] = "not_applicable_sell";
    }
    return {
      status: "sell_side",
      lossPerUnit: null,
      maxLoss: null,
      perTradeBudgetRatio: null,
      monthlyBudgetRemainingRatio: null,
      referenceMaxQuantity: null,
      consecutiveLoss: null,
      kelly: null,
      unavailable,
      ...base,
    };
  }

  const kelly = input.kelly
    ? kellyFraction(input.kelly.winRate, input.kelly.payoffRatio)
    : null;

  const stopInvalid =
    input.stopPrice !== null && input.stopPrice.compare(input.price) >= 0;

  let lossPerUnit: Money | null = null;
  if (input.stopPrice === null) {
    unavailable.maxLoss = "stop_price_missing";
  } else if (stopInvalid) {
    unavailable.maxLoss = "stop_not_below_entry";
  } else {
    // 진입 수수료 + 손절 청산 수수료. 갭(손절가 아래 체결)은 가정하지 않는다 — 가정값은 응답 `assumptions` 에 있다
    const fees = input.price.plus(input.stopPrice).scale(SIZING_FEE_RATE_PER_SIDE);
    lossPerUnit = input.price.minus(input.stopPrice).plus(fees);
  }

  const maxLoss = lossPerUnit ? lossPerUnit.scale(input.quantity) : null;

  let perTradeBudgetRatio: Decimal | null = null;
  if (!maxLoss) unavailable.perTradeBudgetRatio = unavailable.maxLoss;
  else if (!input.perTradeBudget) unavailable.perTradeBudgetRatio = "budget_not_set";
  else perTradeBudgetRatio = ratio(maxLoss, input.perTradeBudget);

  let monthlyBudgetRemainingRatio: Decimal | null = null;
  if (!maxLoss) unavailable.monthlyBudgetRemainingRatio = unavailable.maxLoss;
  else if (!input.monthlyBudget) unavailable.monthlyBudgetRemainingRatio = "budget_not_set";
  else if (!monthlyBudgetRemaining) unavailable.monthlyBudgetRemainingRatio = "insufficient_data";
  else if (monthlyBudgetRemaining.toDecimal().lte(0))
    unavailable.monthlyBudgetRemainingRatio = "monthly_budget_exhausted";
  else monthlyBudgetRemainingRatio = ratio(maxLoss, monthlyBudgetRemaining);

  // 참고 수량 상한 = min(1회 예산 ÷ 단위 손실, 한 종목 상한 수량). 가용 현금은 이 앱이 모른다(수동 입력 · 현금 기록 없음)
  const caps: Array<{ value: Decimal; limitedBy: ReferenceQuantityLimit }> = [];
  if (lossPerUnit && input.perTradeBudget) {
    caps.push({
      value: input.perTradeBudget.toDecimal().div(lossPerUnit.toDecimal()),
      limitedBy: "per_trade_budget",
    });
  }
  const weightCap = weightCapQuantity(
    input.maxSingleAssetWeight,
    input.totalValue,
    input.existingSymbolValue,
    input.price
  );
  if (weightCap !== null && !input.totalValue.isZero()) {
    caps.push({ value: weightCap, limitedBy: "single_asset_weight" });
  }
  const referenceMaxQuantity = caps.length
    ? caps.reduce((min, cap) => (cap.value.lt(min.value) ? cap : min))
    : null;
  if (!referenceMaxQuantity) {
    unavailable.referenceMaxQuantity = unavailable.maxLoss ?? "budget_not_set";
  }

  const consecutiveLoss = maxLoss
    ? {
        count: CONSECUTIVE_LOSS_COUNT,
        amount: maxLoss.scale(CONSECUTIVE_LOSS_COUNT),
        monthlyBudgetRatio: input.monthlyBudget
          ? ratio(maxLoss.scale(CONSECUTIVE_LOSS_COUNT), input.monthlyBudget)
          : null,
      }
    : null;
  if (!consecutiveLoss) unavailable.consecutiveLoss = unavailable.maxLoss;

  return {
    status: stopInvalid ? "stop_not_below_entry" : "ok",
    lossPerUnit,
    maxLoss,
    perTradeBudgetRatio,
    monthlyBudgetRemainingRatio,
    referenceMaxQuantity,
    consecutiveLoss,
    kelly,
    unavailable,
    ...base,
  };
};
