/**
 * 월간 복기 뷰모델 — **순수 함수** (F009 슬라이스 6 `BFF-REQ-038` FR-10).
 *
 * 서버(`SRV-REQ-038` FR-10)가 월초에 한 번 만든 스냅샷이다. 숫자 · 문장 모두 서버 것 — 미러와 같은 규칙으로 모양만 본다:
 * 숫자가 아니면 `null`, 모르는 상태는 `insufficient_data`, 뼈대(달 · 상태)가 깨졌으면 `MonthlyReviewContractError`.
 */

import {
  ADHERENCE_LABELS,
  toBrierView,
  toMetric,
  toTagCost,
  toTagCosts,
  type BrierView,
  type MirrorMetric,
  type TagCostView,
} from "./behavior-mirror.viewmodel";

export class MonthlyReviewContractError extends Error {
  constructor(field: string) {
    super(`monthly review contract broken: ${field}`);
  }
}

type Raw = Record<string, unknown>;
type AdherenceLabel = (typeof ADHERENCE_LABELS)[number];

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null => (typeof value === "string" ? value : null);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
const count = (value: unknown): number => {
  const n = num(value);
  return n !== null && n >= 0 ? Math.floor(n) : 0;
};
const countOrNull = (value: unknown): number | null => {
  const n = num(value);
  return n !== null && n >= 0 ? Math.floor(n) : null;
};
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const REVIEW_STATUSES = ["ok", "month_not_closed", "no_ledger", "truncated"] as const;
const MIRROR_STATUSES = ["ok", "insufficient_sample", "insufficient_data"] as const;

export interface MonthlyReviewBody {
  month: string;
  from: string | null;
  to: string | null;
  /** 만든 시각 — 이 뒤에 고친 태그는 반영되지 않는다(W06) */
  generatedAt: string | null;
  activity: { tradeCount: number; buyCount: number; sellCount: number; closedCount: number };
  adherence: { rate: MirrorMetric; labelCounts: Record<AdherenceLabel, number>; honoredAvgReturn: MirrorMetric; violatedAvgReturn: MirrorMetric };
  disposition: { pgr: MirrorMetric; plr: MirrorMetric; gainHoldingDays: MirrorMetric; lossHoldingDays: MirrorMetric };
  benchmark: {
    status: (typeof MIRROR_STATUSES)[number];
    sampleSize: number;
    actualReturn: number | null;
    holdReturn: number | null;
    difference: number | null;
    feeComponent: number | null;
  };
  turnover: { status: "ok" | "insufficient_data"; value: number | null; tradedNotionalKrw: number | null; feesKrw: number | null };
  tagCosts: TagCostView[];
  topMistake: TagCostView | null;
  ipsDeviation: {
    /** 설정 이력이 없어 지금 설정으로 셌다 — 화면이 이 한 줄을 밝힌다 */
    basis: "current_settings";
    observedDays: number;
    days: number | null;
    lossBudget: { status: "ok" | "budget_not_set" | "insufficient_data"; days: number | null; budgetKrw: number | null };
    concentration: { status: "ok" | "insufficient_data"; days: number | null; limit: number | null };
  };
  brier: BrierView | null;
  /** "이번 달 한 가지" — 서버 템플릿 문장(금액 없음) */
  oneThing: string | null;
}

export interface MonthlyReviewView {
  status: "ok";
  month: string;
  reviewStatus: (typeof REVIEW_STATUSES)[number];
  review: MonthlyReviewBody | null;
  availableMonths: string[];
}

export type MonthlyReviewResult = MonthlyReviewView | { status: "unavailable" };

const toBody = (raw: Raw): MonthlyReviewBody => {
  const month = str(raw.month);
  if (!month || !MONTH_PATTERN.test(month)) throw new MonthlyReviewContractError("review.month");
  const activity = isRecord(raw.activity) ? raw.activity : {};
  const adherence = isRecord(raw.adherence) ? raw.adherence : {};
  const counts = isRecord(adherence.labelCounts) ? adherence.labelCounts : {};
  const disposition = isRecord(raw.disposition) ? raw.disposition : {};
  const benchmark = isRecord(raw.benchmark) ? raw.benchmark : {};
  const turnover = isRecord(raw.turnover) ? raw.turnover : {};
  const ips = isRecord(raw.ipsDeviation) ? raw.ipsDeviation : {};
  const lossBudget = isRecord(ips.lossBudget) ? ips.lossBudget : {};
  const concentration = isRecord(ips.concentration) ? ips.concentration : {};

  return {
    month,
    from: str(raw.from),
    to: str(raw.to),
    generatedAt: str(raw.generatedAt),
    activity: {
      tradeCount: count(activity.tradeCount),
      buyCount: count(activity.buyCount),
      sellCount: count(activity.sellCount),
      closedCount: count(activity.closedCount),
    },
    adherence: {
      rate: toMetric(adherence.rate),
      labelCounts: Object.fromEntries(ADHERENCE_LABELS.map((label) => [label, count(counts[label])])) as Record<
        AdherenceLabel,
        number
      >,
      honoredAvgReturn: toMetric(adherence.honoredAvgReturn),
      violatedAvgReturn: toMetric(adherence.violatedAvgReturn),
    },
    disposition: {
      pgr: toMetric(disposition.pgr),
      plr: toMetric(disposition.plr),
      gainHoldingDays: toMetric(disposition.gainHoldingDays),
      lossHoldingDays: toMetric(disposition.lossHoldingDays),
    },
    benchmark: {
      status: oneOf(benchmark.status, MIRROR_STATUSES) ?? "insufficient_data",
      sampleSize: count(benchmark.sampleSize),
      actualReturn: num(benchmark.actualReturn),
      holdReturn: num(benchmark.holdReturn),
      difference: num(benchmark.difference),
      feeComponent: num(benchmark.feeComponent),
    },
    turnover: {
      status: turnover.status === "ok" && num(turnover.value) !== null ? "ok" : "insufficient_data",
      value: num(turnover.value),
      tradedNotionalKrw: num(turnover.tradedNotionalKrw),
      feesKrw: num(turnover.feesKrw),
    },
    tagCosts: toTagCosts(raw.tagCosts),
    topMistake: toTagCost(raw.topMistake),
    ipsDeviation: {
      basis: "current_settings",
      observedDays: count(ips.observedDays),
      days: countOrNull(ips.days),
      lossBudget: {
        status: oneOf(lossBudget.status, ["ok", "budget_not_set", "insufficient_data"] as const) ?? "insufficient_data",
        days: countOrNull(lossBudget.days),
        budgetKrw: num(lossBudget.budgetKrw),
      },
      concentration: {
        status: concentration.status === "ok" ? "ok" : "insufficient_data",
        days: countOrNull(concentration.days),
        limit: num(concentration.limit),
      },
    },
    brier: toBrierView(raw.brier),
    oneThing: str(raw.oneThing)?.trim() || null,
  };
};

export const toMonthlyReviewViewModel = (data: Raw): MonthlyReviewView => {
  const month = str(data.month);
  const reviewStatus = oneOf(data.status, REVIEW_STATUSES);
  if (!month || !MONTH_PATTERN.test(month)) throw new MonthlyReviewContractError("month");
  if (!reviewStatus) throw new MonthlyReviewContractError("status");
  const review = isRecord(data.review) ? toBody(data.review) : null;
  // ok 인데 본문이 없으면 계약 깨짐 — "이번 달 기록이 없다"로 읽히면 안 된다
  if (reviewStatus === "ok" && !review) throw new MonthlyReviewContractError("review");
  return {
    status: "ok",
    month,
    reviewStatus,
    review: reviewStatus === "ok" ? review : null,
    availableMonths: strings(data.availableMonths).filter((item) => MONTH_PATTERN.test(item)),
  };
};
