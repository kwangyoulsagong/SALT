import type { HouseholdRevolvingBand } from "./ledger";

/**
 * 가계부 화면 계약 — BFF `bff/src/services/app-household.service.ts` 와 같은 모양(`BFF-REQ-048`).
 * **숫자는 전부 서버 값**이다(금액 · 봉투 잔액 · 하루 가용 · 착지 구간). 화면은 표시만 — 더하거나 나누지 않는다.
 */
/** 기본 분류 12개 — 이름은 `CATEGORY_LABEL`(프론트) */
export type DefaultCategoryKey =
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

/** 분류 키 — 기본 12 또는 내 분류(서버가 짓는 `u_` + 12자리, 가계부 S1f). 내 분류 이름은 서버 값 */
export type CategoryKey = DefaultCategoryKey | `u_${string}`;

export type BucketKey = "needs" | "wants";

/** 분류 표 한 칸 — 기본 분류는 name null. archived 는 보관한 내 분류(고르는 칸엔 없고 지난 지출 이름에만) */
export interface HouseholdCategory {
  key: CategoryKey;
  bucket: BucketKey;
  name: string | null;
  custom: boolean;
  archived: boolean;
}

export interface HouseholdCategories {
  categories: HouseholdCategory[];
  /** 보관하지 않은 내 분류 상한(서버 값) */
  limit: number;
}

export interface CategoryRequest {
  name: string;
  bucket: BucketKey;
}

export type PaymentMethodKey = "card" | "cash" | "transfer" | "other";
export type PrecisionKey = "exact" | "approx";
/** template = 반복 템플릿 확인으로 생긴 지출(가계부 S1b) — 화면이 직접 보내지 않는다 */
export type InputKindKey = "quick" | "line" | "paste" | "approx" | "template";

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
  /** 감정 태그(가계부 S1c) — 없으면 null */
  feeling: ExpenseFeeling | null;
  /** 근무 분 — 노동시간 환산을 켰을 때만(서버 계산) */
  workMinutes: number | null;
  /** 평소보다 큰 지출이면 그 분류의 보통 금액(서버 판정 — 가계부 S1e). 월 화면에만 · 저장 응답엔 없음 */
  typicalAmount?: number | null;
}

/**
 * 고정비 후보(가계부 S1e · `SRV-REQ-046` FR-12) — 서버가 찾은 것 그대로. key 는 숨기기 · 되돌리기에 그대로 보낸다.
 * increase 는 앞 회차보다 올랐을 때만(문턱은 서버). 나머지 칸은 반복 템플릿 만들기에 그대로 쓴다
 */
export interface HouseholdFixedCost {
  key: string;
  merchant: string;
  category: CategoryKey;
  paymentMethod: PaymentMethodKey;
  lastAmount: number;
  previousAmount: number;
  increase: number | null;
  lastOn: string;
  nextOn: string;
  dayOfMonth: number;
  count: number;
}

/** 감정 태그 키 — 서버가 목록을 준다(`emotions`). 문구는 프론트 */
export type EmotionKey = "stress" | "reward" | "boredom";

/** nextDecided 인데 feltNext 가 null 이면 넘김 */
export interface ExpenseFeeling {
  emotion: EmotionKey;
  feltNow: number | null;
  feltNext: number | null;
  nextDecided: boolean;
  taggedOn: string;
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
  /** 이번에 적은 합의 근무 분 — 노동시간을 켰을 때만 */
  savedWorkMinutes: number | null;
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
  /** 감정 태그(가계부 S1c) — 산 직후 만족(1~5)은 태그가 있을 때만 */
  emotion?: EmotionKey;
  feltNow?: number;
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
  /** 고를 수 있는 분류 — 기본 12 + 보관 안 한 내 분류 */
  categories: HouseholdCategory[];
  emotions: EmotionKey[];
}

export type BudgetMethodKey = "50_30_20" | "envelope" | "account_split";

/** 통장 쪼개기의 통장 키(가계부 S1f) — salary 는 서버 계산(소득 − 셋), 나머지 셋은 사용자가 넣는다 */
export type AccountKey = "salary" | "spending" | "saving" | "emergency";

export interface HouseholdBudget {
  method: BudgetMethodKey;
  income: number | null;
  savingsShare: number | null;
  /** 통장 쪼개기의 급여 통장 몫(서버 계산). 다른 방식이면 null */
  salaryShare: number | null;
  /** 저장한 값 — 통장 쪼개기면 spending · saving · emergency */
  envelopes: Array<{ key: string; amount: number }>;
  total: number | null;
  updatedAt: string;
}

export interface BudgetRequest {
  method: BudgetMethodKey;
  income?: number;
  /** 봉투면 분류 키 → 금액, 통장 쪼개기면 spending · saving · emergency → 금액 */
  envelopes?: Record<string, number>;
}

export interface HouseholdLanding {
  method: "empirical_window" | "month_over";
  spentSoFar: number;
  /** 아직 확인 안 한 반복 예정 합 — low · high 에 이미 들어 있다(가계부 S1b) */
  scheduled: number;
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

/** 예정 행 단계 — 서버가 정한다. ask = "이번 달에도 나갔나요?" */
export type OccurrenceStage = "ask" | "upcoming" | "confirmed" | "skipped";

export interface HouseholdOccurrence {
  id: string;
  templateId: string;
  name: string;
  amount: number;
  category: CategoryKey;
  dueOn: string;
  stage: OccurrenceStage;
  expenseId: string | null;
}

export interface RecurringTemplate {
  id: string;
  name: string;
  amount: number;
  category: CategoryKey;
  paymentMethod: PaymentMethodKey;
  dayOfMonth: number;
  confirmRequired: boolean;
  startsMonth: string;
  /** 이번 달 예정 행 — 시작 달 전이면 null */
  thisMonth: HouseholdOccurrence | null;
}

export interface RecurringTemplateList {
  templates: RecurringTemplate[];
  /** 템플릿 상한(서버) */
  limit: number;
}

export interface TemplateRequest {
  name: string;
  amount: number;
  category: CategoryKey;
  paymentMethod: PaymentMethodKey;
  dayOfMonth: number;
  confirmRequired: boolean;
}

export interface ConfirmResult {
  occurrenceId: string;
  record: RecordResult;
}

/** 할부 띠 한 줄 — 원거래 amount 는 산 달 합에 이미 들어 있다 */
export interface InstallmentLine {
  expenseId: string;
  merchant: string | null;
  category: CategoryKey;
  amount: number;
  months: number;
  index: number;
  charge: number;
  remainingAfter: number;
  firstMonth: string;
  lastMonth: string;
}

export interface HouseholdInstallments {
  lines: InstallmentLine[];
  monthCharge: number;
  /** 이 달부터 6개월 — 그 달 끝까지 산 할부의 청구 합 */
  upcoming: Array<{ month: string; amount: number }>;
}

export type ReviewQuestionKey = "satisfied" | "try_next" | "known_next";

export interface ReviewAnswers {
  satisfied: string | null;
  tryNext: string | null;
  knownNext: string | null;
}

export interface MonthClose {
  month: string;
  closedAt: string;
  answers: ReviewAnswers;
}

/** 다음 날 묻기 한 줄 — 서버가 고른 것(태그 다음 날 ~ 7일, 아직 안 정함) */
export interface FeelingAsk {
  expenseId: string;
  emotion: EmotionKey;
  feltNow: number | null;
  taggedOn: string;
  amount: number;
  spentOn: string;
  category: CategoryKey;
  merchant: string | null;
}

/** 감정 하나의 분포 — 1~5점 건수(인덱스 0 = 1점). 평균 · 점수 칸 없음 */
export interface EmotionMirror {
  emotion: EmotionKey;
  count: number;
  feltNow: number[];
  feltNext: number[];
}

/** 달력 칸 상태 — 서버가 정한다. blank = 기록 없음(안 쓴 날로 세지 않는다) */
export type CalendarDayState = "future" | "spent" | "no_spend" | "blank";

export interface CalendarDay {
  date: string;
  /** ISO 요일(월 1 ~ 일 7) — 서버가 준다. 칸 자리만 */
  weekday: number;
  state: CalendarDayState;
  spent: number;
  /** 지금 "안 쓴 날"로 표시할 수 있나 */
  markable: boolean;
  /** 챌린지 "한 날" 스티커(가계부 S1d) — 칸 상태와 따로 */
  challenge: boolean;
}

export type WageBasisKey = "hourly" | "monthly";

export interface WorkHoursSetting {
  on: boolean;
  basis: WageBasisKey | null;
  amount: number | null;
  monthlyHours: number | null;
  defaultMonthlyHours: number;
  /** 켰을 때 1시간 값(원) */
  hourly: number | null;
}

export interface WorkHoursRequest {
  on: boolean;
  basis?: WageBasisKey;
  amount?: number;
  monthlyHours?: number;
}

export interface HouseholdMonth {
  month: string;
  current: boolean;
  totals: { total: number; exact: number; approx: number; count: number };
  byCategory: Array<{ key: CategoryKey; bucket: string; spent: number }>;
  /** 분류 표 — 보관 포함(가계부 S1f). 내 분류 이름은 여기서 */
  categories: HouseholdCategory[];
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
  recurring: { items: HouseholdOccurrence[]; scheduledTotal: number };
  installments: HouseholdInstallments;
  /** 리볼빙 띠(가계부 S1h) — 사용자가 적은 명세서로 추정 */
  revolving: HouseholdRevolvingBand;
  /** 닫았으면 그 기록 — 이 달 예산 칸은 닫을 때 붙잡은 값 */
  close: MonthClose | null;
  /** 지금 닫을 수 있나 — 서버가 정한다 */
  closable: boolean;
  reviewQuestions: ReviewQuestionKey[];
  /** 감정 태그 — 다음 날 묻기(이번 달만) · 거울(가계부 S1c) */
  feelings: { asks: FeelingAsk[]; mirror: EmotionMirror[]; emotions: EmotionKey[] };
  /** 무지출 달력 — 1일~말일, 연속 일수 칸 없음 */
  calendar: { days: CalendarDay[]; noSpendDays: number; challengeDays: number };
  /** 노동시간 — 켰을 때만 */
  workHours: { hourly: number; totalMinutes: number } | null;
  /** 고정비 후보 — 이번 달 화면에만(가계부 S1e), 다음 예정일 순 */
  fixedCosts: HouseholdFixedCost[];
}

// ---------- 내가 고르는 챌린지(가계부 S1d · `FE-REQ-057` FR-9) — 실패 · 연속 일수 칸 없음 ----------

/** 서버가 정한다 — 시작 전 · 하는 중 · 끝(기간이 지났든 그만뒀든 같은 끝) */
export type ChallengePhase = "upcoming" | "running" | "ended";

export type ChallengePresetKey = "no_spend_weekend" | "skip_coffee" | "no_delivery" | "no_taxi";

/** 아낀 돈 한 줄 — 실제 적립이 아니다. goalId 는 보탠 목표(없으면 null) */
export interface ChallengeSaving {
  id: string;
  amount: number;
  savedOn: string;
  note: string | null;
  goalId: string | null;
  contributedAt: string | null;
}

export interface Challenge {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  endedOn: string | null;
  phase: ChallengePhase;
  /** 표시한 날(날짜 순) — 개수만 보인다 */
  days: string[];
  /** 오늘을 "한 날"로 표시할 수 있나 — 서버가 정한다 */
  todayMarkable: boolean;
  savedTotal: number;
  contributedTotal: number;
  savings: ChallengeSaving[];
}

/** 보탤 수 있는 저축 목표(진행 중) */
export interface GoalOption {
  id: string;
  title: string;
  template: string;
}

export interface ChallengeList {
  items: Challenge[];
  presets: ChallengePresetKey[];
  limit: number;
  openCount: number;
  /** 상한에 닿았나 — 서버가 정한다 */
  canStart: boolean;
  /** 기간 상한(일) — 안내 글자. 넘으면 서버가 거절한다 */
  periodDaysMax: number;
  /** 서버 오늘(KST) — 시작 칸 min · 기본값 */
  today: string;
  /** 시작 칸 max — 서버가 더한 날짜(화면은 날짜를 더하지 않는다) */
  startMax: string;
  /** null 이면 저축 서비스가 답하지 못했다 — 보태기 칸만 숨긴다 */
  goals: GoalOption[] | null;
}

export interface StartChallengeRequest {
  title: string;
  startsOn?: string;
  endsOn: string;
}

/**
 * 이야기 카드 한 줄(가계부 S1g — `BFF-REQ-048` `HouseholdStoryLineVM`). kind 마다 쓰는 칸만 찬다 — 금액 칸은 amount 하나.
 * 어떤 줄이 나올지 · 금액 · 몫은 서버. 모르는 kind 는 화면이 건너뛴다
 */
export interface HouseholdStoryLine {
  kind: string;
  amount: number | null;
  count: number | null;
  days: number | null;
  approx: boolean | null;
  category: CategoryKey | null;
  sharePercent: number | null;
  month: string | null;
}

export interface HouseholdStory {
  /** YYYY-MM | YYYY */
  period: string;
  scope: "month" | "year";
  ready: boolean;
  /** 아직이면 볼 수 있는 첫날 */
  readyOn: string | null;
  /** 값이 없는 줄은 서버가 뺐다 — 빈 목록이면 적은 게 없는 기간 */
  lines: HouseholdStoryLine[];
  categories: HouseholdCategory[];
}
