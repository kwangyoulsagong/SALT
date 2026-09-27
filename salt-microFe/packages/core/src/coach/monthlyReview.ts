/**
 * 월간 복기 뷰모델 (F009 슬라이스 6 `BFF-REQ-038` FR-10 · `FE-REQ-039`).
 *
 * BFF `monthly-review.viewmodel.ts` 가 소유하는 계약이다. 서버가 **월초에 한 번 만든 스냅샷**이다 — 뒤에 태그를 고쳐도
 * 그달 숫자는 바뀌지 않는다(`generatedAt`). 지금 기준의 숫자는 미러에 있다.
 * 숫자 · "이번 달 한 가지" 문장은 서버 것이다 — 화면은 표시만 한다.
 */

import type { BrierView, MirrorMetric, TagCostView } from "./behaviorMirror";
import type { AdherenceLabel } from "./tradeRisk";

export type MonthlyReviewStatus = "ok" | "month_not_closed" | "no_ledger" | "truncated";

export interface MonthlyReviewBody {
  month: string;
  from: string | null;
  to: string | null;
  generatedAt: string | null;
  activity: { tradeCount: number; buyCount: number; sellCount: number; closedCount: number };
  adherence: {
    rate: MirrorMetric;
    labelCounts: Record<AdherenceLabel, number>;
    honoredAvgReturn: MirrorMetric;
    violatedAvgReturn: MirrorMetric;
  };
  disposition: { pgr: MirrorMetric; plr: MirrorMetric; gainHoldingDays: MirrorMetric; lossHoldingDays: MirrorMetric };
  benchmark: {
    status: MirrorMetric["status"];
    sampleSize: number;
    actualReturn: number | null;
    holdReturn: number | null;
    difference: number | null;
    feeComponent: number | null;
  };
  /** 그달 (매수 + 매도 대금) ÷ 2 ÷ 월말 평가금. 연환산하지 않는다 */
  turnover: { status: "ok" | "insufficient_data"; value: number | null; tradedNotionalKrw: number | null; feesKrw: number | null };
  tagCosts: TagCostView[];
  /** 그달 손익 합이 가장 작은(음수) 태그 */
  topMistake: TagCostView | null;
  ipsDeviation: {
    /** 설정 이력이 없어 **지금 설정**으로 셌다 */
    basis: "current_settings";
    observedDays: number;
    /** 둘 중 하나라도 넘은 날. 둘 다 못 쟀으면 `null` */
    days: number | null;
    lossBudget: { status: "ok" | "budget_not_set" | "insufficient_data"; days: number | null; budgetKrw: number | null };
    concentration: { status: "ok" | "insufficient_data"; days: number | null; limit: number | null };
  };
  /** 만기가 그달에 든 "오를 확률" 채점 */
  brier: BrierView | null;
  /** "이번 달 한 가지" — 서버 템플릿 문장(금액 없음) */
  oneThing: string | null;
}

export interface MonthlyReviewView {
  status: "ok";
  month: string;
  reviewStatus: MonthlyReviewStatus;
  review: MonthlyReviewBody | null;
  /** 저장된 달(최신이 앞, 최대 12) */
  availableMonths: string[];
}

export type MonthlyReviewResult = MonthlyReviewView | { status: "unavailable" };
