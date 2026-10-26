import Decimal from "decimal.js";

import type { Money } from "../../../shared/domain";
import type { BudgetSetting, PortfolioScenarios, TradePlan } from "../../domain";
import type { TradeSizeCheck } from "../../application/CheckTradeSize";
import type { RiskBudgetView } from "../../application/ManageRiskBudget";
import { toBehaviorPreviewResponse } from "./mirrorView";

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

/** 국내 주식 갭 두 줄(F011 FR-45). 갭률은 소수(−0.3 = −30%), 금액은 원 정수 */
const toGapScenariosResponse = (scenarios: TradeSizeCheck["gapScenarios"]) =>
  scenarios
    ? {
        limitDown: { gapRate: rate(scenarios.limitDown.gapRate), maxLossKrw: krw(scenarios.limitDown.maxLoss) },
        historicalGap: scenarios.historical
          ? {
              quantile: scenarios.historical.quantile,
              gapRate: rate(scenarios.historical.gapRate),
              worstGapRate: rate(scenarios.historical.worstGapRate),
              sample: scenarios.historical.sample,
              since: scenarios.historical.since,
              maxLossKrw: krw(scenarios.historical.maxLoss),
            }
          : null,
        historicalGapUnavailable: scenarios.historicalUnavailable,
        // 손절가에서 팔린다는 보장이 없다(VI · 거래정지 · 연속 하한가) — 문장은 화면이 코드로 고른다
        noteCode: "stop_may_not_fill" as const,
      }
    : null;

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
    gapScenarios: toGapScenariosResponse(result.gapScenarios),
    assumptions: {
      feeRatePerSide: rate(result.assumptions.feeRatePerSide),
      // 매도 거래세(오늘 매도 기준). 코인은 null. 둘 다 명시 비용만 — 스프레드 · 슬리피지는 없다(F011 FR-44)
      sellTaxRate: rate(result.assumptions.sellTaxRate),
      stopGapAssumed: false,
      targetVolatility: rate(result.assumptions.targetVolatility),
      targetVolatilityIsDefault: result.assumptions.targetVolatilityIsDefault,
      maxSingleAssetWeight: rate(result.assumptions.maxSingleAssetWeight),
    },
    volatilityAsOf: result.volatilityAsOf,
    behavior: toBehaviorPreviewResponse(result.behavior),
    asOf: result.asOf,
    orderExecution: result.orderExecution,
  };
};

export const toRiskBudgetResponse = (view: RiskBudgetView) => {
  const { drawdown, concentration, turnover, btcBeta, portfolioVolatility } = view.gauges;
  return {
    settings: {
      monthlyLossBudget: budget(view.settings.monthlyLossBudget),
      perTradeMaxLoss: budget(view.settings.perTradeMaxLoss),
      monthlyLossBudgetKrw: krw(view.settings.monthlyLossBudgetKrw),
      perTradeMaxLossKrw: krw(view.settings.perTradeMaxLossKrw),
      targetVolatility: rate(view.settings.targetVolatility),
      targetVolatilityIsDefault: view.settings.targetVolatilityIsDefault,
      maxSingleAssetWeight: rate(view.settings.maxSingleAssetWeight),
      investableCapitalKrw: krw(view.settings.investableCapital),
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
      btcBeta: {
        status: btcBeta.status,
        betaSum: rate(btcBeta.betaSum),
        btcEquivalentKrw: krw(btcBeta.btcEquivalent),
        coveredWeight: rate(btcBeta.coveredWeight),
        missingSymbols: btcBeta.missingSymbols,
      },
      // F011 FR-46 — 합산 변동성(연) 범위. 판정 없음
      portfolioVolatility: {
        status: portfolioVolatility.status,
        upper: rate(portfolioVolatility.upper),
        realized: rate(portfolioVolatility.realized),
        crossCorrelation: rate(portfolioVolatility.crossCorrelation),
        grid: portfolioVolatility.grid,
        periodsPerYear: portfolioVolatility.periodsPerYear,
        returns: portfolioVolatility.returns,
        from: portfolioVolatility.from,
        to: portfolioVolatility.to,
        coveredWeight: rate(portfolioVolatility.coveredWeight),
        missingSymbols: portfolioVolatility.missingSymbols,
      },
    },
    market: view.market
      ? {
          asOf: view.market.asOf,
          trendOpen: view.market.trendOpen,
          btcClose: view.market.close,
          btcSma200d: view.market.sma200d,
          highVolProbability: view.market.highVolProbability,
          drawdown365dRate: view.market.drawdown365d,
          gate: { key: view.market.gateKey, open: view.market.gateOpen },
          eventFactor: view.market.eventFactor,
          nextEvent: view.market.nextEventKind
            ? { kind: view.market.nextEventKind, at: view.market.nextEventAt }
            : null,
          preregKey: view.market.preregKey,
        }
      : null,
    scenarios: toScenariosResponse(view.scenarios),
    monthStart: view.monthStart,
    asOf: view.asOf,
  };
};

/** 시나리오(FR-25) — 확률 필드가 없다. 손실은 음수 원 */
const toScenariosResponse = (scenarios: PortfolioScenarios) => ({
  status: scenarios.status,
  totalValueKrw: krw(scenarios.totalValue),
  shocks: scenarios.shocks.map((shock) => ({
    shock: rate(shock.shock),
    lossKrw: krw(shock.loss),
    valueAfterKrw: krw(shock.valueAfter),
    bySymbol: shock.bySymbol.map((row) => ({ symbol: row.symbol, lossKrw: krw(row.loss) })),
  })),
  episodes: scenarios.episodes.map((episode) => ({
    id: episode.id,
    from: episode.from,
    to: episode.to,
    status: episode.status,
    lossKrw: krw(episode.loss),
    returnRate: rate(episode.returnRate),
    bySymbol: episode.bySymbol.map((row) => ({
      symbol: row.symbol,
      returnRate: rate(row.returnRate),
      lossKrw: krw(row.loss),
    })),
    missingSymbols: episode.missingSymbols,
  })),
});

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
  checklist: plan.checklist,
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
