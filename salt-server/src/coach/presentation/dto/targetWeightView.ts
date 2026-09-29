import Decimal from "decimal.js";

import type { Money } from "../../../shared/domain";
import type { TargetWeightView } from "../../application/GetTargetWeights";

/**
 * 목표 비중 안내 응답(F010 슬라이스 5) — 원 반올림은 여기 한 번(`ddd-presentation.md` §2).
 *
 * - 금액 `*Krw` 원 정수 · 비율 `*Weight` · `sigma` 소수 6자리 · 수량 소수 8자리(부족은 내림, 초과는 올림 —
 *   반올림하면 목표를 넘는 수량이 나온다)
 */

const krw = (money: Money | null): number | null => (money ? money.toKrwInteger() : null);
const rate = (value: Decimal | null): number | null =>
  value === null ? null : value.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber();
const quantity = (value: Decimal): number =>
  value.toDecimalPlaces(8, value.isNegative() ? Decimal.ROUND_UP : Decimal.ROUND_DOWN).toNumber();

export const toTargetWeightResponse = (view: TargetWeightView) => {
  const { guide } = view;
  return {
    status: guide.status,
    basis: guide.basis,
    capitalKrw: krw(guide.capital),
    capitalBelowHoldings: guide.capitalBelowHoldings,
    rows: guide.rows.map((row) => ({
      symbol: row.symbol,
      held: row.held,
      core: row.core,
      sigma: rate(row.sigma),
      btcBeta: row.btcBeta,
      priceKrw: krw(row.price),
      targetWeight: rate(row.targetWeight),
      currentWeight: rate(row.currentWeight),
      gapWeight: rate(row.gapWeight),
      gapCapped: row.gapCapped,
      targetValueKrw: krw(row.targetValue),
      currentValueKrw: krw(row.currentValue),
      gapValueKrw: krw(row.gapValue),
      gapQuantity: quantity(row.gapQuantity),
      status: row.status,
      stopPriceKrw: krw(row.stopPrice),
      lossAtStopKrw: krw(row.lossAtStop),
      sigmaBand: { low: rate(row.sigmaBand.low), high: rate(row.sigmaBand.high) },
      volatilityAsOf: row.volatilityAsOf,
    })),
    excluded: guide.excluded.map((row) => ({
      symbol: row.symbol,
      held: row.held,
      reason: row.reason,
      currentValueKrw: krw(row.currentValue),
    })),
    totals: {
      targetExposure: rate(guide.totals.targetExposure),
      currentExposure: rate(guide.totals.currentExposure),
      cashTargetWeight: rate(new Decimal(1).minus(guide.totals.targetExposure)),
      sleeveSigma: rate(guide.totals.sleeveSigma),
      targetBetaSum: rate(guide.totals.targetBetaSum),
      betaCoveredWeight: rate(guide.totals.betaCoveredWeight),
      lossAtStopTotalKrw: krw(guide.totals.lossAtStopTotal),
      lossAtStopMonthlyBudgetRate: rate(guide.totals.lossAtStopMonthlyBudgetRatio),
      outsideRuleWeight: rate(guide.totals.outsideRuleWeight),
      fundableKrw: krw(guide.totals.fundable),
    },
    expiresAt: guide.expiresAt,
    volatilityAsOf: guide.volatilityAsOf,
    targetVolatility: rate(view.targetVolatility),
    targetVolatilityIsDefault: view.targetVolatilityIsDefault,
    maxSingleAssetWeight: rate(view.maxSingleAssetWeight),
    // 기록은 리포트 상수 그대로(이미 반올림된 비율) — 여기서 다시 반올림하지 않는다
    record: view.record,
    backtest: view.backtest,
    // 판정 · 라이브 요약은 salt-forecast 가 낸 비율 그대로(이미 등록 정의로 계산됨)
    altShare: view.altShare,
    live: view.live,
    liveMinWeeks: view.liveMinWeeks,
    recordSource: view.recordSource,
    renderable: view.renderable,
    blockedReason: view.blockedReason,
    asOf: view.asOf,
    orderExecution: view.orderExecution,
  };
};
