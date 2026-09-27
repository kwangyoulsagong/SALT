import Decimal from "decimal.js";

import type { DecisionOutcome, MirrorMetric } from "../../domain";
import type { BehaviorMirrorView } from "../../application/GetBehaviorMirror";

/**
 * F009 슬라이스 4 응답 변환 — 미러 · 결정 결과. 규칙은 `riskView` 와 같다.
 *
 * - 금액: 원 정수(`*Krw`) — 반올림은 여기서 한 번
 * - 비율 · 수익률 · R: 소수 6자리 숫자(0.28 = 28%)
 * - 일수: 소수 2자리
 */

const rate = (value: Decimal | null): number | null =>
  value === null ? null : value.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber();
const krw = (value: Decimal): number => value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
const days = (value: Decimal | null): number | null =>
  value === null ? null : value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

const metric = (value: MirrorMetric, format: (value: Decimal | null) => number | null = rate) => ({
  value: format(value.value),
  sampleSize: value.sampleSize,
  status: value.status,
});

export const toBehaviorMirrorResponse = (view: BehaviorMirrorView) => ({
  status: view.status,
  adherence: view.adherence && {
    rate: metric(view.adherence.rate),
    labelCounts: view.adherence.labelCounts,
    honoredAvgReturn: metric(view.adherence.honoredAvgReturn),
    violatedAvgReturn: metric(view.adherence.violatedAvgReturn),
  },
  disposition: view.disposition && {
    pgr: metric(view.disposition.pgr),
    plr: metric(view.disposition.plr),
    counts: view.disposition.counts,
    gainHoldingDays: metric(view.disposition.gainHoldingDays, days),
    lossHoldingDays: metric(view.disposition.lossHoldingDays, days),
    missingCloses: view.disposition.missingCloses,
  },
  benchmark: view.benchmark && {
    status: view.benchmark.status,
    sampleSize: view.benchmark.sampleSize,
    actualReturn: rate(view.benchmark.actualReturn),
    holdReturn: rate(view.benchmark.holdReturn),
    difference: rate(view.benchmark.difference),
    feeComponent: rate(view.benchmark.feeComponent),
    timingComponent: rate(view.benchmark.timingComponent),
    from: view.benchmark.from,
    to: view.benchmark.to,
    missingCloses: view.benchmark.missingCloses,
    assumptions: ["twr_daily_close", "net_inflow_bought_same_day_same_weights", "carry_forward_missing_close"],
  },
  tagCosts: view.tagCosts.map((cost) => ({
    tag: cost.tag,
    count: cost.count,
    netPnlKrw: krw(cost.netPnlKrw),
    avgReturn: rate(cost.avgReturn),
    avgR: rate(cost.avgR),
    rSampleSize: cost.rSampleSize,
    status: cost.status,
    noEdge: cost.noEdge,
  })),
  turnover: {
    trailingYearTurnover: rate(view.turnover.gauge?.trailingYearTurnover ?? null),
    feesYearToDateKrw: view.turnover.gauge?.feesYearToDate?.toKrwInteger() ?? null,
    tradeCount: view.turnover.gauge?.tradeCount ?? null,
    status: view.turnover.gauge?.status ?? "insufficient_data",
    baseline: {
      ...view.turnover.baseline,
      newRetailDailyTurnover: view.turnover.baseline.newRetailDailyTurnover.toNumber(),
      marketDailyTurnover: view.turnover.baseline.marketDailyTurnover.toNumber(),
    },
  },
  outcomeCount: view.outcomeCount,
  outcomesComputedAt: view.outcomesComputedAt,
  minSample: view.minSample,
  asOf: view.asOf,
});

export const toDecisionOutcomeResponse = (outcome: DecisionOutcome) => ({
  id: outcome.id,
  planId: outcome.planId,
  closingTransactionId: outcome.closingTransactionId,
  symbol: outcome.symbol,
  openedAt: outcome.openedAt,
  closedAt: outcome.closedAt,
  holdingDays: days(outcome.holdingDays),
  quantity: outcome.quantity.toDecimalPlaces(8, Decimal.ROUND_DOWN).toNumber(),
  netPnlKrw: krw(outcome.netPnlKrw),
  feesKrw: krw(outcome.feesKrw),
  netReturn: rate(outcome.netReturn),
  rMultiple: rate(outcome.rMultiple),
  /** 청산 30일 뒤 종가 기준 "그냥 들고 있었으면"의 수익률. 30일이 안 지났으면 `null` */
  heldReturn30d: rate(outcome.benchmarkReturn),
  adherenceLabel: outcome.adherenceLabel,
  autoTags: outcome.autoTags,
  userTags: outcome.userTags,
  tagsConfirmedAt: outcome.userTagsConfirmedAt,
  computedAt: outcome.computedAt,
});
