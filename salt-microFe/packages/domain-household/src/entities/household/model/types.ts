/**
 * 가계부 화면 계약 — BFF `bff/src/services/app-household.service.ts` 와 같은 모양(`BFF-REQ-048`).
 * **숫자는 전부 서버 값**이다(금액 · 봉투 잔액 · 하루 가용 · 착지 구간). 화면은 표시만 — 더하거나 나누지 않는다.
 */
export type CategoryKey =
  | "food"
  | "cafe"
  | "transport"
  | "housing"
  | "telecom"
  | "living"
  | "health"
  | "education"
  | "shopping"
  | "culture"
  | "gift"
  | "other";

export type PaymentMethodKey = "card" | "cash" | "transfer" | "other";
export type PrecisionKey = "exact" | "approx";
export type InputKindKey = "quick" | "line" | "paste" | "approx";

export interface HouseholdExpense {
  id: string;
  amount: number;
  spentOn: string;
  category: CategoryKey;
  paymentMethod: PaymentMethodKey;
  merchant: string | null;
  precision: PrecisionKey;
  inputKind: InputKindKey;
  installmentMonths: number | null;
  memo: string | null;
  createdAt: string;
}

/** 봉투 — remaining 은 음수 가능(넘침). 상태 · 경고 칸이 없다 */
export interface HouseholdEnvelope {
  /** 50/30/20 이면 needs · wants, 봉투 방식이면 분류 키 */
  key: string;
  budget: number;
  spent: number;
  remaining: number;
}

export type GoalClock =
  | { state: "ok"; goalId: string; title: string; template: string; delayDays: number }
  | { state: "none"; reason: string }
  | { state: "pending" };

export interface RecordResult {
  expenses: HouseholdExpense[];
  savedTotal: number;
  envelope: HouseholdEnvelope | null;
  monthTotal: number;
  goalClock: GoalClock;
}

export interface ExpenseRequest {
  amount: number;
  category: CategoryKey;
  spentOn?: string;
  paymentMethod?: PaymentMethodKey;
  merchant?: string;
  precision?: PrecisionKey;
  inputKind?: InputKindKey;
  installmentMonths?: number;
  memo?: string;
}

export interface ParseCandidate {
  amount: number;
  merchant: string | null;
  spentOn: string;
  installmentMonths: number | null;
  paymentMethod: PaymentMethodKey;
  category: CategoryKey | null;
  categorySource: "history" | "rule" | null;
}

export interface ParseResult {
  candidates: ParseCandidate[];
  /** cancelled · no_amount */
  skipped: string[];
}

export interface HouseholdSuggestions {
  merchants: Array<{ merchant: string; category: CategoryKey; lastAmount: number; count: number }>;
  categories: Array<{ key: CategoryKey; bucket: "needs" | "wants" }>;
}

export type BudgetMethodKey = "50_30_20" | "envelope";

export interface HouseholdBudget {
  method: BudgetMethodKey;
  income: number | null;
  savingsShare: number | null;
  envelopes: Array<{ key: string; amount: number }>;
  total: number | null;
  updatedAt: string;
}

export interface BudgetRequest {
  method: BudgetMethodKey;
  income?: number;
  envelopes?: Partial<Record<CategoryKey, number>>;
}

export interface HouseholdLanding {
  method: "empirical_window" | "month_over";
  spentSoFar: number;
  low: number | null;
  high: number | null;
  reason: "history_short" | null;
  daysOfHistory: number;
}

export interface HouseholdTrack {
  month: string;
  issuedOn: string | null;
  low: number | null;
  high: number | null;
  actual: number | null;
  hit: boolean | null;
  reason: string | null;
}

export interface HouseholdMonth {
  month: string;
  current: boolean;
  totals: { total: number; exact: number; approx: number; count: number };
  byCategory: Array<{ key: CategoryKey; bucket: string; spent: number }>;
  budget: HouseholdBudget | null;
  envelopes: HouseholdEnvelope[];
  unbudgeted: number | null;
  remaining: number | null;
  dailyAvailable: number | null;
  daysLeft: number | null;
  landing: HouseholdLanding | null;
  landingReason: string | null;
  track: HouseholdTrack | null;
  expenses: HouseholdExpense[];
}
