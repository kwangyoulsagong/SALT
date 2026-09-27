import Decimal from "decimal.js";

import type { BrierSummary, Jsonified, MirrorMetric, TagCost } from "../../domain";
import type { MonthlyReviewView } from "../../application/ManageMonthlyReview";
import { days, metric, rate, tagCost, toBrierResponse } from "./mirrorView";

/**
 * 월간 복기 응답(FR-28) — 저장된 스냅샷(숫자 문자열)을 미러와 **같은 규칙**으로 옮긴다.
 * 문자열을 `Decimal` 로 되살려 미러 변환 함수를 그대로 쓴다 — 두 화면의 반올림이 갈라지지 않게.
 */

const dec = (value: string | null): Decimal | null => (value === null ? null : new Decimal(value));
const krw = (value: string | null): number | null =>
  value === null ? null : new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

const revive = (value: Jsonified<MirrorMetric>): MirrorMetric => ({ ...value, value: dec(value.value) });

const reviveTagCost = (cost: Jsonified<TagCost>): TagCost => ({
  ...cost,
  netPnlKrw: new Decimal(cost.netPnlKrw),
  avgReturn: new Decimal(cost.avgReturn),
  avgR: dec(cost.avgR),
});

const reviveBrier = (brier: Jsonified<BrierSummary>): BrierSummary => ({
  ...brier,
  meanScore: revive(brier.meanScore),
  baseline: new Decimal(brier.baseline),
  skill: dec(brier.skill),
  recentMisses: brier.recentMisses.map((item) => ({
    ...item,
    probabilityUp: new Decimal(item.probabilityUp),
    plannedAt: new Date(item.plannedAt),
    dueAt: new Date(item.dueAt),
    referenceClose: new Decimal(item.referenceClose),
    outcomeClose: new Decimal(item.outcomeClose),
    score: new Decimal(item.score),
  })),
});

export const toMonthlyReviewResponse = (view: MonthlyReviewView) => {
  const stored = view.review;
  if (!stored) {
    return { month: view.month, status: view.status, review: null, availableMonths: view.availableMonths };
  }
  const review = stored.payload;
  const { adherence, disposition, benchmark, turnover, ipsDeviation } = review;
  return {
    month: view.month,
    status: view.status,
    availableMonths: view.availableMonths,
    review: {
      month: review.month,
      from: review.from,
      to: review.to,
      generatedAt: stored.generatedAt,
      activity: review.activity,
      adherence: {
        rate: metric(revive(adherence.rate)),
        labelCounts: adherence.labelCounts,
        honoredAvgReturn: metric(revive(adherence.honoredAvgReturn)),
        violatedAvgReturn: metric(revive(adherence.violatedAvgReturn)),
      },
      disposition: {
        pgr: metric(revive(disposition.pgr)),
        plr: metric(revive(disposition.plr)),
        counts: disposition.counts,
        gainHoldingDays: metric(revive(disposition.gainHoldingDays), days),
        lossHoldingDays: metric(revive(disposition.lossHoldingDays), days),
        missingCloses: disposition.missingCloses,
      },
      benchmark: {
        status: benchmark.status,
        sampleSize: benchmark.sampleSize,
        actualReturn: rate(dec(benchmark.actualReturn)),
        holdReturn: rate(dec(benchmark.holdReturn)),
        difference: rate(dec(benchmark.difference)),
        feeComponent: rate(dec(benchmark.feeComponent)),
        timingComponent: rate(dec(benchmark.timingComponent)),
        from: benchmark.from,
        to: benchmark.to,
        missingCloses: benchmark.missingCloses,
      },
      turnover: {
        status: turnover.status,
        value: rate(dec(turnover.value)),
        tradedNotionalKrw: krw(turnover.tradedNotional),
        feesKrw: krw(turnover.fees),
      },
      tagCosts: review.tagCosts.map((cost) => tagCost(reviveTagCost(cost))),
      topMistake: review.topMistake && tagCost(reviveTagCost(review.topMistake)),
      ipsDeviation: {
        basis: ipsDeviation.basis,
        observedDays: ipsDeviation.observedDays,
        days: ipsDeviation.days,
        lossBudget: {
          status: ipsDeviation.lossBudget.status,
          days: ipsDeviation.lossBudget.days,
          budgetKrw: krw(ipsDeviation.lossBudget.budget),
        },
        concentration: {
          status: ipsDeviation.concentration.status,
          days: ipsDeviation.concentration.days,
          limit: rate(dec(ipsDeviation.concentration.limit)),
        },
        missingCloses: ipsDeviation.missingCloses,
      },
      brier: toBrierResponse(reviveBrier(review.brier)),
      oneThing: review.oneThing,
    },
  };
};
