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

export type MilestoneState = "no_plan" | "under_plan" | "plan_met" | "reached";

export interface SavingsMilestone {
  month: string;
  deposited: number;
  plan: number | null;
  difference: number | null;
  state: MilestoneState;
}

export type ProjectionReason = "history_short" | "reached" | "slow_side_open" | "no_plan" | "degraded" | "not_reachable";

export interface SavingsProjection {
  method: "empirical_quantile" | "plan_only";
  earlyMonth: string | null;
  lateMonth: string | null;
  planMonth: string | null;
  reason: ProjectionReason | null;
  monthsOfHistory: number;
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
  /** 서버가 구간을 못 계산했다 — 계획값만 있다(`BFF-REQ-047` 수용 기준 2) */
  degraded: boolean;
  degradedReasons: string[];
  /** 모이는 장면(S1b, FR-8) — 칸은 서버가 정한다 */
  scene: SavingsScene;
  /** 도장 수 — 첫 도장 + 직접 넣은 적립(FR-10) */
  stampCount: number;
  /** 다 찬 목표의 엽서(FR-10). 진행 중이면 null */
  postcard: SavingsPostcard | null;
  /** 첫 실물 단위의 환산 한 줄(FR-9). 단위가 없으면 null */
  unitLine: SavingsItemUnit | null;
  /** 기한 모드: 지금 월 계획대로면 기한 안에 닿나(서버 판정). 기한 없으면 null */
  planMeetsDeadline: boolean | null;
}

export type SceneKind = "trip" | "car" | "umbrella" | "house" | "jar";

export interface SavingsScene {
  kind: SceneKind;
  step: number;
  steps: number;
}

export interface SavingsItemUnit {
  id: string;
  name: string;
  unitPrice: number;
  /** 모은 돈으로 몇 개 — 서버 내림 */
  count: number;
}

export interface SavingsPostcard {
  startedOn: string;
  reachedOn: string;
  daysTaken: number;
  depositCount: number;
}

export interface SavingsMissedMonths {
  observedMonths: number;
  skippedMonths: number;
  /** 건너뛴 달마다 계획만큼 넣었다면 계획 도달이 몇 달 빨랐을지 — 없으면 null + reason */
  shiftMonths: number | null;
  reason: ProjectionReason | null;
}

export interface SavingsSimProjection {
  method: "empirical_quantile" | "plan_only";
  earlyMonth: string | null;
  lateMonth: string | null;
  planMonth: string | null;
  reason: ProjectionReason | null;
}

export interface SavingsSimulationRow {
  goalId: string;
  title: string;
  template: GoalTemplateKey;
  monthlyBefore: number | null;
  monthlyAfter: number | null;
  before: SavingsSimProjection;
  after: SavingsSimProjection;
  /** + 늦어짐 · − 빨라짐(서버가 센 달 수) */
  planShiftMonths: number | null;
  /** "2027-12"(기한 모드만) */
  deadlineMonth: string | null;
  /** 바꾼 계획대로면 기한 안에 닿나 — 기한 없으면 null */
  afterMeetsDeadline: boolean | null;
}

export interface SavingsSimulation {
  totalMonthlyBefore: number;
  totalMonthlyAfter: number;
  rows: SavingsSimulationRow[];
}

/** 저울 · 확정 요청 — 바꾼 목표만 */
export interface PlanChangesRequest {
  changes: { goalId: string; monthly: number }[];
}

export interface EmergencyRequest {
  amount: number;
  /** 사용자가 넣은 연 금리(%) — 상품을 고르지 않는다 */
  loanRate: number;
  loanMonths: number;
}

export interface SavingsEmergency {
  amount: number;
  withdraw: { planMonthBefore: string | null; planMonthAfter: string | null; delayMonths: number | null; reason: ProjectionReason | null };
  /** firstPayment × firstMonths + restPayment × restMonths = 원금 + totalInterest — 서버 값. 나누어떨어지면 restMonths 0 */
  loan: { months: number; annualRate: string; firstPayment: number; firstMonths: number; restPayment: number; restMonths: number; totalInterest: number } | null;
  /** 나눌 수 없으면(`amount_too_small`) — 꺼내기 칸은 그대로 */
  loanReason: string | null;
  /** 가정 키 — `loan_paid_outside_goal` */
  assumptions: string[];
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
  /** 응답 어디든 계산이 불완전하면 true — goal.degraded(구간) + 상세 칸(놓친 달) */
  degraded: boolean;
  degradedReasons: string[];
  plan: SavingsCalculation;
  deposits: SavingsDeposit[];
  /** 놓친 달 회고(FR-7) */
  missedMonths: SavingsMissedMonths;
  /** 이 목표의 실물 단위 */
  units: SavingsItemUnit[];
  /** 목표 하나에 둘 수 있는 단위 수 — 서버 상한(화면이 상수를 복사하지 않는다) */
  unitLimit: number;
}

/** 계산 요청 — 금액 + (기한 | 월 적립). 서버가 계산한다 */
export interface CalculationRequest {
  targetAmount: number;
  targetDate?: string;
  monthly?: number;
  includeInterest: boolean;
  annualRate?: number;
}
