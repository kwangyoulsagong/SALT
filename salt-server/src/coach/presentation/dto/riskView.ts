import Decimal from "decimal.js";

import type { Money } from "../../../shared/domain";
import type { BudgetSetting, TradePlan } from "../../domain";
import type { TradeSizeCheck } from "../../application/CheckTradeSize";
import type { RiskBudgetView } from "../../application/ManageRiskBudget";

/**
 * F009 슬라이스 1 응답 변환 — **원 반올림이 일어나는 유일한 자리**(`ddd-presentation.md` §2).
 *
 * - 금액: 원 정수(`*Krw`)
 * - 비율: 소수 6자리 숫자(`*Rate` · `*Weight` · 0.28 = 28%). 퍼센트 문자열로 만들지 않는다 — 표시는 화면 몫
 * - 수량: 소수 8자리
 */

const krw = (money: Money | null): number | null => (money ? money.toKrwInteger() : null);
const rate = (value: Decimal | null): number | null =>
  value === null ? null : value.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber();
const quantity = (value: Decimal | null): number | null =>
  value === null ? null : value.toDecimalPlaces(8, Decimal.ROUND_DOWN).toNumber();
const budget = (setting: BudgetSetting | null) =>
  setting ? { amount: setting.amount.toNumber(), unit: setting.unit } : null;

export const toSizeCheckResponse = (result: TradeSizeCheck) => {
  const { sizing } = result;
  return {
    symbol: result.symbol,
    side: result.side,
    status: sizing.status,
    maxLossKrw: krw(sizing.maxLoss),
    lossPerUnitKrw: krw(sizing.lossPerUnit),
    perTradeBudgetRate: rate(sizing.perTradeBudgetRatio),
    monthlyBudgetRemainingRate: rate(sizing.monthlyBudgetRemainingRatio),
    monthlyBudgetRemainingKrw: krw(sizing.monthlyBudgetRemaining),
    // 참고 수량은 내림 — 반올림하면 상한을 넘는 수량이 나온다
    referenceMaxQuantity: sizing.referenceMaxQuantity
      ? {
          value: quantity(sizing.referenceMaxQuantity.value),
          limitedBy: sizing.referenceMaxQuantity.limitedBy,
        }
      : null,
    volTargetWeight: rate(sizing.volTargetWeight),
    currentWeight: rate(sizing.currentWeight),
    projectedWeight: rate(sizing.projectedWeight),
    consecutiveLoss: sizing.consecutiveLoss
      ? {
          count: sizing.consecutiveLoss.count,
          amountKrw: krw(sizing.consecutiveLoss.amount),
          monthlyBudgetRate: rate(sizing.consecutiveLoss.monthlyBudgetRatio),
        }
      : null,
    kelly: sizing.kelly
      ? {
          full: rate(sizing.kelly.full),
          half: rate(sizing.kelly.half),
          quarter: rate(sizing.kelly.quarter),
          hasEdge: sizing.kelly.hasEdge,
          // FR-6 "엣지 추정 오차 경고 문장 고정" — 문장은 화면이 코드로 고른다
          noteCode: "edge_estimate_uncertain" as const,
        }
      : null,
    unavailable: sizing.unavailable,
    assumptions: {
      feeRatePerSide: rate(result.assumptions.feeRatePerSide),
      stopGapAssumed: false,
      targetVolatility: rate(result.assumptions.targetVolatility),
      targetVolatilityIsDefault: result.assumptions.targetVolatilityIsDefault,
      maxSingleAssetWeight: rate(result.assumptions.maxSingleAssetWeight),
    },
    volatilityAsOf: result.volatilityAsOf,
    asOf: result.asOf,
    orderExecution: result.orderExecution,
  };
};

export const toRiskBudgetResponse = (view: RiskBudgetView) => {
  const { drawdown, concentration, turnover } = view.gauges;
  return {
    settings: {
      monthlyLossBudget: budget(view.settings.monthlyLossBudget),
      perTradeMaxLoss: budget(view.settings.perTradeMaxLoss),
      monthlyLossBudgetKrw: krw(view.settings.monthlyLossBudgetKrw),
      perTradeMaxLossKrw: krw(view.settings.perTradeMaxLossKrw),
      targetVolatility: rate(view.settings.targetVolatility),
      targetVolatilityIsDefault: view.settings.targetVolatilityIsDefault,
    },
    totalValueKrw: krw(view.totalValue),
    gauges: {
      drawdown: {
        status: drawdown.status,
        budgetKrw: krw(drawdown.budget),
        usedKrw: krw(drawdown.used),
        usedRate: rate(drawdown.usedRatio),
        monthPnlKrw: krw(drawdown.monthPnl),
        missingCloses: drawdown.missingCloses,
      },
      concentration: {
        status: concentration.status,
        topSymbol: concentration.topSymbol,
        topWeight: rate(concentration.topWeight),
        limit: rate(concentration.limit),
      },
      turnover: {
        status: turnover.status,
        trailingYearTurnover: rate(turnover.trailingYearTurnover),
        tradedNotionalKrw: krw(turnover.tradedNotional),
        feesYearToDateKrw: krw(turnover.feesYearToDate),
        tradeCount: turnover.tradeCount,
      },
    },
    monthStart: view.monthStart,
    asOf: view.asOf,
  };
};

const price = (value: Decimal | null): number | null => (value === null ? null : value.toNumber());

export const toTradePlanResponse = (plan: TradePlan) => ({
  id: plan.id,
  transactionId: plan.transactionId,
  symbol: plan.symbol,
  side: plan.side,
  stopPrice: price(plan.stopPrice),
  targetPrice: price(plan.targetPrice),
  plannedQuantity: quantity(plan.plannedQuantity),
  thesis: plan.thesis,
  invalidation: plan.invalidation,
  reviewAt: plan.reviewAt,
  probabilityUp: rate(plan.probabilityUp),
  plannedAt: plan.plannedAt,
  /** 거래에 연결돼 손절가 · 계획 수량 · 오를 확률을 바꿀 수 없다 */
  locked: plan.transactionId !== null,
  adherence: {
    label: plan.adherenceLabel,
    userLabel: plan.userAdherenceLabel,
    evaluatedAt: plan.adherenceEvaluatedAt,
  },
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});
