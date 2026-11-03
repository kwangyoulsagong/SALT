/**
 * 저축 목표 화면 계약 — BFF `/api/app/savings/*` 뷰모델(`BFF-REQ-047`, `bff/src/services/app-savings.service.ts` 와 같은 모양).
 *
 * **숫자는 전부 서버가 계산한 값이다**(`FE-REQ-056` 수용 기준 1). 이 패키지는 금액 · 날짜 · 비율을 더하거나 나누지 않는다 —
 * 표시 포맷(원 단위 쉼표 · "2027년 11월")만 한다. 상태는 키로 오고 문구는 `messages.ts` 가 키로 고른다.
 */

export type GoalTemplateKey = "wedding" | "housing" | "first_car" | "travel" | "emergency" | "childbirth" | "other";

export interface SavingsTemplate {
  key: GoalTemplateKey;
  baseline: { amount: number; source: string; year: number; verified: boolean } | null;
  /** 기준선이 없는 이유 — `unverified_source`(원문 대조 전) */
  baselineReason: string | null;
}

export type CalculationState = "ok" | "reached" | "deadline_too_close" | "not_reachable";

export interface SavingsCalculation {
  state: CalculationState;
  remaining: number;
  monthly: number | null;
  months: number | null;
  /** "2027-11" */
  reachMonth: string | null;
  expectedInterest: number;
  assumptions: { interestTaxRatePercent: string; interestOnSavedIncluded: boolean };
}

export type MilestoneState = "no_plan" | "under_plan" | "plan_met";

export interface SavingsMilestone {
  month: string;
  deposited: number;
  plan: number | null;
  difference: number | null;
  state: MilestoneState;
}

export type ProjectionReason = "history_short" | "reached" | "slow_side_open" | "no_plan";

export interface SavingsProjection {
  method: "empirical_quantile" | "plan_only";
  earlyMonth: string | null;
  lateMonth: string | null;
  planMonth: string | null;
  reason: ProjectionReason | null;
  monthsOfHistory: number;
  issuedAt: string | null;
  /** 적중 이력 — 채점(`FC-REQ-024`)이 생기기 전엔 null 이고 `trackReason` 이 이유 */
  track: unknown;
  trackReason: string | null;
}

export interface SavingsGoal {
  id: string;
  title: string;
  template: GoalTemplateKey;
  status: "active" | "completed" | "paused";
  targetAmount: number;
  saved: number;
  remaining: number;
  /** 0.0~100.0 — 서버가 소수 한 자리 내림으로 준다 */
  progressPercent: number;
  /** 0~1 — 진척 막대용(서버가 준다, 화면이 퍼센트를 나누지 않는다) */
  progressRatio: number;
  /** 진척 50% 전엔 모은 돈, 뒤엔 남은 돈을 앞에(서버가 정한다 — FR-9) */
  frame: "saved" | "remaining";
  targetDate: string | null;
  monthlyPlan: number | null;
  includeInterest: boolean;
  annualRate: string | null;
  depositCount: number;
  lastDepositedOn: string | null;
  createdAt: string;
  completedAt: string | null;
  milestone: SavingsMilestone;
  projection: SavingsProjection;
}

export interface SavingsDeposit {
  id: string;
  amount: number;
  depositedOn: string;
  note: string | null;
  splitGroupId: string | null;
  source: "manual" | "saved_by_challenge" | "imported_balance";
}

export interface SavingsGoalDetail {
  goal: SavingsGoal;
  plan: SavingsCalculation;
  deposits: SavingsDeposit[];
}

/** 계산 요청 — 금액 + (기한 | 월 적립). 서버가 계산한다 */
export interface CalculationRequest {
  targetAmount: number;
  targetDate?: string;
  monthly?: number;
  includeInterest: boolean;
  annualRate?: number;
}
