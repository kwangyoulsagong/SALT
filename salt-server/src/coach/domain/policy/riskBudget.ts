/**
 * 리스크 예산 · 게이지 — FEATURE-009 FR-1~3 · FR-17 · FR-23~24 (`SRV-REQ-038`).
 *
 * ## 이번 달 손익을 평단 없이 구한다
 *
 * 월 손익 = 지금 평가금액 − 월초 평가금액 − 이번 달 순매수(매수 + 수수료 − 매도 + 수수료).
 * 월초 보유 수량은 지금 수량에서 이번 달 거래를 되감아 얻는다. 평균 매입가를 되살릴 필요가 없어
 * 실현 · 미실현을 가르지 않고도 **시가 평가 손익**이 정확하다. 월초 종가가 없는 종목이 하나라도
 * 월초에 보유돼 있었으면 합을 만들지 않는다 — 한 종목을 0 으로 치면 손익이 조용히 틀린다.
 *
 * ## 막지 않는다
 *
 * 예산을 넘어도 게이지 상태가 `exceeded` 가 될 뿐이다(FR-23 "게이지 색만").
 */

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import type { BudgetSetting, CoachLedgerEntry } from "../model";

/** 월초 수량이 이보다 작으면 보유가 없던 것으로 본다(되감기 부동소수 찌꺼기) */
const QUANTITY_EPSILON = new Decimal("1e-9");

export type GaugeStatus = "ok" | "exceeded" | "budget_not_set" | "insufficient_data";

/** 예산을 원으로. 비율 예산은 그 시점 평가금액 대비다. 평가금액이 0 이면 비율 예산은 구할 수 없다 */
export const resolveBudget = (
  setting: BudgetSetting | null,
  totalValue: Money
): Money | null => {
  if (!setting) return null;
  if (setting.unit === "krw") return Money.krw(setting.amount);
  if (totalValue.isZero()) return null;
  return totalValue.scale(setting.amount);
};

export interface MonthToDateInput {
  /** 지금 보유 — 종목별 수량 · 평가금액(원) */
  holdings: Array<{ symbol: string; quantity: number; value: number }>;
  /** 이번 달(KST) 거래 */
  trades: CoachLedgerEntry[];
  /** 월초 첫 종가. 없는 종목은 키가 없다 */
  monthStartCloses: Map<string, number>;
}

export type MonthToDateResult =
  | { status: "ok"; pnl: Money; startValue: Money; netInflow: Money }
  | { status: "insufficient_data"; missingCloses: string[] };

/** 월초에 보유가 있었던 종목. 월초 종가를 이것만 읽으면 된다 */
export const monthStartQuantities = (
  holdings: MonthToDateInput["holdings"],
  trades: CoachLedgerEntry[]
): Map<string, Decimal> => {
  const quantities = new Map<string, Decimal>();
  for (const holding of holdings) {
    quantities.set(holding.symbol, new Decimal(holding.quantity));
  }
  for (const trade of trades) {
    const current = quantities.get(trade.symbol) ?? new Decimal(0);
    const delta = new Decimal(trade.quantity);
    quantities.set(trade.symbol, trade.side === "buy" ? current.minus(delta) : current.plus(delta));
  }
  for (const [symbol, quantity] of quantities) {
    if (quantity.lte(QUANTITY_EPSILON)) quantities.delete(symbol);
  }
  return quantities;
};

export const monthToDatePnl = (input: MonthToDateInput): MonthToDateResult => {
  const startQuantities = monthStartQuantities(input.holdings, input.trades);

  const missingCloses = [...startQuantities.keys()].filter(
    (symbol) => !input.monthStartCloses.has(symbol)
  );
  if (missingCloses.length) return { status: "insufficient_data", missingCloses };

  let startValue = Money.krw(0);
  for (const [symbol, quantity] of startQuantities) {
    startValue = startValue.plus(Money.krw(input.monthStartCloses.get(symbol)!).scale(quantity));
  }

  const nowValue = input.holdings.reduce(
    (sum, holding) => sum.plus(Money.krw(holding.value)),
    Money.krw(0)
  );

  // 순유입 = 매수 대금 + 수수료 − (매도 대금 − 수수료). 수수료는 양쪽 다 손익에서 빠진다
  const netInflow = input.trades.reduce((sum, trade) => {
    const fee = Money.krw(trade.fee);
    const amount = Money.krw(trade.totalAmount);
    return trade.side === "buy" ? sum.plus(amount).plus(fee) : sum.minus(amount).plus(fee);
  }, Money.krw(0));

  return {
    status: "ok",
    pnl: nowValue.minus(startValue).minus(netInflow),
    startValue,
    netInflow,
  };
};

export interface DrawdownGauge {
  status: GaugeStatus;
  budget: Money | null;
  /** 쓴 손실(0 이상). 이번 달이 이익이면 0 */
  used: Money | null;
  usedRatio: Decimal | null;
  monthPnl: Money | null;
  missingCloses: string[];
}

export const drawdownGauge = (budget: Money | null, month: MonthToDateResult): DrawdownGauge => {
  if (month.status === "insufficient_data") {
    return {
      status: "insufficient_data",
      budget,
      used: null,
      usedRatio: null,
      monthPnl: null,
      missingCloses: month.missingCloses,
    };
  }
  const used = month.pnl.isNegative() ? month.pnl.scale(-1) : Money.krw(0);
  if (!budget) {
    return { status: "budget_not_set", budget: null, used, usedRatio: null, monthPnl: month.pnl, missingCloses: [] };
  }
  const usedRatio = used.toDecimal().div(budget.toDecimal());
  return {
    status: usedRatio.gt(1) ? "exceeded" : "ok",
    budget,
    used,
    usedRatio,
    monthPnl: month.pnl,
    missingCloses: [],
  };
};

export interface ConcentrationGauge {
  /** 이름은 "종목 집중도"다(C07) — 자산군 · 섹터 쏠림이 아니다 */
  status: GaugeStatus;
  topSymbol: string | null;
  topWeight: Decimal | null;
  limit: Decimal;
}

export const concentrationGauge = (
  holdings: Array<{ symbol: string; value: number }>,
  limit: Decimal
): ConcentrationGauge => {
  const total = holdings.reduce((sum, holding) => sum.plus(holding.value), new Decimal(0));
  if (total.lte(0)) {
    return { status: "insufficient_data", topSymbol: null, topWeight: null, limit };
  }
  const top = holdings.reduce((max, holding) => (holding.value > max.value ? holding : max));
  const topWeight = new Decimal(top.value).div(total);
  return {
    status: topWeight.gt(limit) ? "exceeded" : "ok",
    topSymbol: top.symbol,
    topWeight,
    limit,
  };
};

export interface TurnoverGauge {
  status: "ok" | "insufficient_data";
  /** 최근 365일 (매수 + 매도 대금) ÷ 2 ÷ 지금 평가금액. 기간을 늘려 환산하지 않는다 */
  trailingYearTurnover: Decimal | null;
  tradedNotional: Money;
  /** 올해(KST 1월 1일부터) 수수료 합. 거래를 다 읽지 못했으면 `null` */
  feesYearToDate: Money | null;
  tradeCount: number;
}

export const turnoverGauge = (input: {
  trades: CoachLedgerEntry[];
  totalValue: Money;
  yearStart: Date;
  /** 거래를 다 읽지 못했으면 합이 거짓이다 */
  truncated: boolean;
}): TurnoverGauge => {
  const tradedNotional = input.trades.reduce(
    (sum, trade) => sum.plus(Money.krw(trade.totalAmount)),
    Money.krw(0)
  );
  const feesYearToDate = input.trades
    .filter((trade) => trade.transactionDate >= input.yearStart)
    .reduce((sum, trade) => sum.plus(Money.krw(trade.fee)), Money.krw(0));

  const computable = !input.truncated && !input.totalValue.isZero();
  return {
    status: computable ? "ok" : "insufficient_data",
    trailingYearTurnover: computable
      ? tradedNotional.toDecimal().div(2).div(input.totalValue.toDecimal())
      : null,
    tradedNotional,
    feesYearToDate: input.truncated ? null : feesYearToDate,
    tradeCount: input.trades.length,
  };
};
