import { logger } from "../config/logger";
import { appSavingsService } from "./app-savings.service";
import { backendApi } from "./backend-api.service";

/**
 * 가계부 화면 계약 (`BFF-REQ-048`, 서버 `SRV-REQ-046` — Kotlin `household` 서비스, 라우팅 표 `/household` → platform).
 *
 * **숫자는 서버 응답 그대로**다 — 금액 · 봉투 잔액 · 착지 구간을 서버가 정하고 BFF 는 화면 필드만 고른다. 더하거나 나누지 않는다.
 * 하나 조립하는 것: 저장 응답에 **목표 시계**(저축 서비스 `goal-clock`)를 나란히 붙인다 — 서비스끼리 부르지 않게 BFF 가 모은다
 * (가계부 슬라이스 판단 1). 저축이 예산 안에 답하지 못하면 `pending` 이고 저장은 기다리지 않는다(수용 기준 2).
 *
 * **붙여넣은 결제 문자(원문)는 이 파일 어디서도 로그에 남기지 않는다**(FR-2). 원문은 `parse` 의 인자로 서버까지만 지나간다.
 */

// ---------- 화면 계약 — 웹 `@repo/domain-household` entities/expense/model/types.ts 와 같은 모양 ----------

export interface HouseholdExpenseVM {
  id: string;
  amount: number;
  spentOn: string;
  /** 분류 키 — 이름은 프론트가 키로 고른다 */
  category: string;
  /** card · cash · transfer · other */
  paymentMethod: string;
  merchant: string | null;
  /** exact · approx */
  precision: string;
  /** quick · line · paste · approx */
  inputKind: string;
  installmentMonths: number | null;
  memo: string | null;
  createdAt: string;
  /** 감정 태그(가계부 S1c) — 없으면 null. 민감 정보: BFF 는 로그에 남기지 않는다 */
  feeling: HouseholdFeelingVM | null;
  /** 근무 분 — 노동시간 환산을 켰을 때만(서버 계산) */
  workMinutes: number | null;
}

/** 감정 태그 — emotion 키 · 산 직후 · 다음 날(1~5). nextDecided 인데 feltNext 가 null 이면 넘김 */
export interface HouseholdFeelingVM {
  /** stress · reward · boredom */
  emotion: string;
  feltNow: number | null;
  feltNext: number | null;
  nextDecided: boolean;
  taggedOn: string;
}

/** 봉투 — `remaining` 은 음수 가능. 상태 · 경고 칸이 없다(수용 기준) */
export interface HouseholdEnvelopeVM {
  key: string;
  budget: number;
  spent: number;
  remaining: number;
}

/**
 * 목표 시계 — `ok`(지연 일수) · `none`(진행 중 목표 없음 · 계획 없음, reason) · `pending`(저축이 예산 안에 답하지 못함 — 화면이 "계산 중" 뒤 다시 묻는다)
 */
export type HouseholdGoalClockVM =
  | { state: "ok"; goalId: string; title: string; template: string; delayDays: number }
  | { state: "none"; reason: string }
  | { state: "pending" };

export interface HouseholdRecordVM {
  expenses: HouseholdExpenseVM[];
  savedTotal: number;
  envelope: HouseholdEnvelopeVM | null;
  monthTotal: number;
  /** 이번에 적은 합의 근무 분 — 노동시간을 켰을 때만 */
  savedWorkMinutes: number | null;
  goalClock: HouseholdGoalClockVM;
}

export interface HouseholdCandidateVM {
  amount: number;
  merchant: string | null;
  spentOn: string;
  installmentMonths: number | null;
  paymentMethod: string;
  category: string | null;
  /** history · rule · null */
  categorySource: string | null;
}

export interface HouseholdParseVM {
  candidates: HouseholdCandidateVM[];
  /** 버린 조각의 이유 키 — cancelled · no_amount */
  skipped: string[];
}

export interface HouseholdSuggestionsVM {
  merchants: Array<{ merchant: string; category: string; lastAmount: number; count: number }>;
  categories: Array<{ key: string; bucket: string }>;
  /** 감정 태그 키(가계부 S1c) */
  emotions: string[];
}

export interface HouseholdBudgetVM {
  /** 50_30_20 · envelope */
  method: string;
  income: number | null;
  savingsShare: number | null;
  envelopes: Array<{ key: string; amount: number }>;
  total: number | null;
  updatedAt: string;
}

export interface HouseholdLandingVM {
  /** empirical_window · month_over */
  method: string;
  spentSoFar: number;
  /** 아직 확인 안 한 반복 예정 합 — low · high 에 이미 들어 있다(가계부 S1b) */
  scheduled: number;
  low: number | null;
  high: number | null;
  /** history_short · null */
  reason: string | null;
  daysOfHistory: number;
}

export interface HouseholdTrackVM {
  month: string;
  issuedOn: string | null;
  low: number | null;
  high: number | null;
  actual: number | null;
  hit: boolean | null;
  /** not_issued · history_short · null */
  reason: string | null;
}

/** 예정 행 — stage 는 서버가 정한다: ask("이번 달에도 나갔나요?") · upcoming · confirmed · skipped */
export interface HouseholdOccurrenceVM {
  id: string;
  templateId: string;
  name: string;
  amount: number;
  category: string;
  dueOn: string;
  stage: string;
  expenseId: string | null;
}

export interface HouseholdTemplateVM {
  id: string;
  name: string;
  amount: number;
  category: string;
  paymentMethod: string;
  dayOfMonth: number;
  confirmRequired: boolean;
  startsMonth: string;
  /** 이번 달 예정 행 — 시작 달 전이면 null */
  thisMonth: HouseholdOccurrenceVM | null;
}

export interface HouseholdTemplateListVM {
  templates: HouseholdTemplateVM[];
  /** 템플릿 상한(서버) */
  limit: number;
}

/** 할부 띠 한 줄 — 원거래 `amount` 는 산 달 합에 이미 들어 있다 */
export interface HouseholdInstallmentLineVM {
  expenseId: string;
  merchant: string | null;
  category: string;
  amount: number;
  months: number;
  index: number;
  charge: number;
  remainingAfter: number;
  firstMonth: string;
  lastMonth: string;
}

export interface HouseholdInstallmentsVM {
  lines: HouseholdInstallmentLineVM[];
  monthCharge: number;
  /** 이 달부터 6개월 — 그 달 끝까지 산 할부의 청구 합 */
  upcoming: Array<{ month: string; amount: number }>;
}

export interface HouseholdCloseVM {
  month: string;
  closedAt: string;
  answers: { satisfied: string | null; tryNext: string | null; knownNext: string | null };
}

/** 다음 날 묻기 한 줄 — 서버가 고른 것(태그 다음 날 ~ 7일, 아직 안 정함) */
export interface HouseholdFeelingAskVM {
  expenseId: string;
  emotion: string;
  feltNow: number | null;
  taggedOn: string;
  amount: number;
  spentOn: string;
  category: string;
  merchant: string | null;
}

/** 감정 하나의 분포 — 1~5점 건수(인덱스 0 = 1점). 평균 · 점수 칸 없음 */
export interface HouseholdMirrorVM {
  emotion: string;
  count: number;
  feltNow: number[];
  feltNext: number[];
}

/** 달력 칸 — state 는 서버가 정한다: future · spent · no_spend · blank. 연속 일수 칸 없음 */
export interface HouseholdCalendarDayVM {
  date: string;
  /** ISO 요일(월 1 ~ 일 7) — 칸 자리 */
  weekday: number;
  state: string;
  spent: number;
  markable: boolean;
}

/** 노동시간 설정 — hourly 는 켰을 때 1시간 값(원) */
export interface HouseholdWorkHoursVM {
  on: boolean;
  /** hourly · monthly · null */
  basis: string | null;
  amount: number | null;
  monthlyHours: number | null;
  defaultMonthlyHours: number;
  hourly: number | null;
}

/** 반복 확인 응답 — 저장 응답과 같은 모양 + 목표 시계 */
export interface HouseholdConfirmVM {
  occurrenceId: string;
  record: HouseholdRecordVM;
}

export interface HouseholdMonthVM {
  month: string;
  current: boolean;
  totals: { total: number; exact: number; approx: number; count: number };
  byCategory: Array<{ key: string; bucket: string; spent: number }>;
  budget: HouseholdBudgetVM | null;
  envelopes: HouseholdEnvelopeVM[];
  unbudgeted: number | null;
  remaining: number | null;
  dailyAvailable: number | null;
  daysLeft: number | null;
  landing: HouseholdLandingVM | null;
  /** not_current_month · null */
  landingReason: string | null;
  track: HouseholdTrackVM | null;
  expenses: HouseholdExpenseVM[];
  recurring: { items: HouseholdOccurrenceVM[]; scheduledTotal: number };
  installments: HouseholdInstallmentsVM;
  close: HouseholdCloseVM | null;
  /** 지금 닫을 수 있나 — 서버가 정한다 */
  closable: boolean;
  /** 리뷰 문항 키(문장은 프론트) */
  reviewQuestions: string[];
  /** 감정 태그 — 다음 날 묻기(이번 달만) · 거울 · 키 목록(가계부 S1c) */
  feelings: { asks: HouseholdFeelingAskVM[]; mirror: HouseholdMirrorVM[]; emotions: string[] };
  /** 무지출 달력 — 1일~말일 */
  calendar: { days: HouseholdCalendarDayVM[]; noSpendDays: number };
  /** 노동시간 — 켰을 때만 */
  workHours: { hourly: number; totalMinutes: number } | null;
}

/** 홈 카드가 쓰는 서버 숫자(`GET /household/home-card`) */
export interface HouseholdHomeCardSource {
  month: string;
  spent: number;
  count: number;
  remaining: number | null;
  landing: HouseholdLandingVM;
}

/** 쓰기는 재시도하지 않는다(중복 지출). 조회 예산 — 월 화면 쿼리 16회(S1c) + 여유 */
const READ_TIMEOUT_MS = 2_000;
const WRITE_TIMEOUT_MS = 5_000;
/** 저장 응답에 붙이는 목표 시계의 상한 — 넘으면 `pending`(FEATURE-013 비기능 "저장 → 목표 시계 1초 이내") */
export const GOAL_CLOCK_BUDGET_MS = 300;

const data = <T>(response: { data?: { data?: unknown } }): T => response.data?.data as T;

/** 정해진 시간 안에 오지 않으면 실패로 본다 */
const within = <T>(work: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`goal clock timeout ${ms}ms`)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const toGoalClock = (source: { goalId: string | null; title: string | null; template: string | null; delayDays: number | null; reason: string | null }): HouseholdGoalClockVM =>
  source.delayDays !== null && source.goalId && source.title && source.template
    ? { state: "ok", goalId: source.goalId, title: source.title, template: source.template, delayDays: source.delayDays }
    : { state: "none", reason: source.reason ?? "no_active_goal" };

class AppHouseholdService {
  async record(token: string, body: unknown): Promise<HouseholdRecordVM> {
    const saved = data<Omit<HouseholdRecordVM, "goalClock">>(
      await backendApi.proxyAuthRequest("POST", "/household/expenses", token, body, { timeout: WRITE_TIMEOUT_MS }),
    );
    return { ...saved, goalClock: await this.clockAfterSave(token, saved.savedTotal) };
  }

  async recordBatch(token: string, body: unknown): Promise<HouseholdRecordVM> {
    const saved = data<Omit<HouseholdRecordVM, "goalClock">>(
      await backendApi.proxyAuthRequest("POST", "/household/expenses/batch", token, body, { timeout: WRITE_TIMEOUT_MS }),
    );
    return { ...saved, goalClock: await this.clockAfterSave(token, saved.savedTotal) };
  }

  /** `pending` 뒤 화면이 다시 묻는 자리 — 조회 예산 */
  async goalClock(token: string, amount: string): Promise<HouseholdGoalClockVM> {
    return toGoalClock(await appSavingsService.goalClock(token, amount, READ_TIMEOUT_MS));
  }

  async deleteExpense(token: string, id: string): Promise<{ id: string }> {
    return data(await backendApi.proxyAuthRequest("DELETE", `/household/expenses/${encodeURIComponent(id)}`, token, undefined, { timeout: WRITE_TIMEOUT_MS }));
  }

  /** 원문은 본문 그대로 서버로 — 여기서 읽거나 남기지 않는다 */
  async parse(token: string, body: unknown): Promise<HouseholdParseVM> {
    return data(await backendApi.proxyAuthRequest("POST", "/household/parse", token, body, { timeout: READ_TIMEOUT_MS }));
  }

  async suggestions(token: string): Promise<HouseholdSuggestionsVM> {
    return data(await backendApi.proxyAuthRequest("GET", "/household/suggestions", token, undefined, { timeout: READ_TIMEOUT_MS }));
  }

  async budget(token: string): Promise<HouseholdBudgetVM | null> {
    return data(await backendApi.proxyAuthRequest("GET", "/household/budget", token, undefined, { timeout: READ_TIMEOUT_MS }));
  }

  async setBudget(token: string, body: unknown): Promise<HouseholdBudgetVM> {
    return data(await backendApi.proxyAuthRequest("PUT", "/household/budget", token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async month(token: string, ym: string): Promise<HouseholdMonthVM> {
    return data(await backendApi.proxyAuthRequest("GET", `/household/month/${encodeURIComponent(ym)}`, token, undefined, { timeout: READ_TIMEOUT_MS }));
  }

  // ---------- 반복 · 마감(가계부 S1b) — 중계만 ----------

  async templates(token: string): Promise<HouseholdTemplateListVM> {
    return data(await backendApi.proxyAuthRequest("GET", "/household/templates", token, undefined, { timeout: READ_TIMEOUT_MS }));
  }

  async createTemplate(token: string, body: unknown): Promise<HouseholdTemplateVM> {
    return data(await backendApi.proxyAuthRequest("POST", "/household/templates", token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async editTemplate(token: string, id: string, body: unknown): Promise<HouseholdTemplateVM> {
    return data(await backendApi.proxyAuthRequest("PUT", `/household/templates/${encodeURIComponent(id)}`, token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async endTemplate(token: string, id: string): Promise<{ id: string }> {
    return data(await backendApi.proxyAuthRequest("DELETE", `/household/templates/${encodeURIComponent(id)}`, token, undefined, { timeout: WRITE_TIMEOUT_MS }));
  }

  /** "나갔어요" — 지출이 생기므로 저장과 같이 목표 시계를 붙인다 */
  async confirmOccurrence(token: string, id: string, body: unknown): Promise<HouseholdConfirmVM> {
    const confirmed = data<{ occurrenceId: string; record: Omit<HouseholdRecordVM, "goalClock"> }>(
      await backendApi.proxyAuthRequest("POST", `/household/occurrences/${encodeURIComponent(id)}/confirm`, token, body, { timeout: WRITE_TIMEOUT_MS }),
    );
    return { occurrenceId: confirmed.occurrenceId, record: { ...confirmed.record, goalClock: await this.clockAfterSave(token, confirmed.record.savedTotal) } };
  }

  async skipOccurrence(token: string, id: string): Promise<{ id: string }> {
    return data(await backendApi.proxyAuthRequest("POST", `/household/occurrences/${encodeURIComponent(id)}/skip`, token, undefined, { timeout: WRITE_TIMEOUT_MS }));
  }

  async closeMonth(token: string, ym: string, body: unknown): Promise<HouseholdCloseVM> {
    return data(await backendApi.proxyAuthRequest("POST", `/household/month/${encodeURIComponent(ym)}/close`, token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  // ---------- 거울 셋(가계부 S1c) — 중계만. 감정 · 만족 · 급여는 민감 정보: 본문을 로그에 남기지 않는다 ----------

  async tagFeeling(token: string, id: string, body: unknown): Promise<HouseholdFeelingVM> {
    return data(await backendApi.proxyAuthRequest("PUT", `/household/expenses/${encodeURIComponent(id)}/feeling`, token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async untagFeeling(token: string, id: string): Promise<{ id: string }> {
    return data(await backendApi.proxyAuthRequest("DELETE", `/household/expenses/${encodeURIComponent(id)}/feeling`, token, undefined, { timeout: WRITE_TIMEOUT_MS }));
  }

  async answerNextDay(token: string, id: string, body: unknown): Promise<HouseholdFeelingVM> {
    return data(await backendApi.proxyAuthRequest("POST", `/household/expenses/${encodeURIComponent(id)}/feeling/next`, token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async workHours(token: string): Promise<HouseholdWorkHoursVM> {
    return data(await backendApi.proxyAuthRequest("GET", "/household/settings/work-hours", token, undefined, { timeout: READ_TIMEOUT_MS }));
  }

  async setWorkHours(token: string, body: unknown): Promise<HouseholdWorkHoursVM> {
    return data(await backendApi.proxyAuthRequest("PUT", "/household/settings/work-hours", token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async markNoSpend(token: string, date: string): Promise<{ date: string }> {
    return data(await backendApi.proxyAuthRequest("PUT", `/household/no-spend/${encodeURIComponent(date)}`, token, undefined, { timeout: WRITE_TIMEOUT_MS }));
  }

  async unmarkNoSpend(token: string, date: string): Promise<{ date: string }> {
    return data(await backendApi.proxyAuthRequest("DELETE", `/household/no-spend/${encodeURIComponent(date)}`, token, undefined, { timeout: WRITE_TIMEOUT_MS }));
  }

  async homeCard(token: string, timeout: number): Promise<HouseholdHomeCardSource> {
    return data(await backendApi.proxyAuthRequest("GET", "/household/home-card", token, undefined, { timeout }));
  }

  /** 저장은 이미 끝났다 — 목표 시계가 늦거나 실패해도 저장 응답을 깨지 않는다(`pending`) */
  private async clockAfterSave(token: string, amount: number): Promise<HouseholdGoalClockVM> {
    try {
      return toGoalClock(await within(appSavingsService.goalClock(token, String(amount), GOAL_CLOCK_BUDGET_MS), GOAL_CLOCK_BUDGET_MS));
    } catch (error) {
      // 금액 · 본문 없이 사유만(`msa-services.md` §5)
      logger.warn("목표 시계를 예산 안에 받지 못했다", { reason: (error as Error | undefined)?.message });
      return { state: "pending" };
    }
  }
}

export const appHouseholdService = new AppHouseholdService();
