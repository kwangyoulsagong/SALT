import { backendApi } from "./backend-api.service";

/**
 * 저축 화면 계약 (`BFF-REQ-047`, 서버 `SRV-REQ-045` — Kotlin `savings` 서비스, 라우팅 표 `/savings` → platform).
 *
 * **숫자는 서버 응답 그대로**다(수용 기준 1 — 가공 0). 금액 · 날짜 · 구간 · 진척률 · 프레임을 서버가 정하고
 * BFF 는 화면 필드만 고른다. 문장도 만들지 않는다 — 상태 키만 중계하고 문구는 프론트가 키로 고른다(FR-8).
 * 서버 4xx(형식 · 합계 불일치 · 없는 목표)는 error middleware 가 status · `code` 를 그대로 옮긴다.
 */

// ---------- 화면 계약 — 웹 `@repo/domain-savings` model/types.ts 와 같은 모양 ----------

export interface SavingsTemplateVM {
  key: string;
  baseline: { amount: number; source: string; year: number; verified: boolean } | null;
  /** 기준선이 없는 이유 — 지금은 `unverified_source`(원문 대조 전) */
  baselineReason: string | null;
}

export interface SavingsCalculationVM {
  /** ok · reached · deadline_too_close · not_reachable */
  state: string;
  remaining: number;
  monthly: number | null;
  months: number | null;
  /** "2027-11" */
  reachMonth: string | null;
  expectedInterest: number;
  assumptions: { interestTaxRatePercent: string; interestOnSavedIncluded: boolean };
}

export interface SavingsMilestoneVM {
  month: string;
  deposited: number;
  plan: number | null;
  difference: number | null;
  /** no_plan · under_plan · plan_met · reached */
  state: string;
}

export interface SavingsProjectionVM {
  /** empirical_quantile · plan_only */
  method: string;
  earlyMonth: string | null;
  lateMonth: string | null;
  planMonth: string | null;
  /** history_short · reached · slow_side_open · no_plan · degraded · not_reachable(100년 안에 못 닿음 — 2026-11-03) */
  reason: string | null;
  monthsOfHistory: number;
  /** 적중 이력(채점 `FC-REQ-024` 뒤). 없으면 null 이고 trackReason 이 이유 */
  track: unknown;
  trackReason: string | null;
}

export interface SavingsGoalVM {
  id: string;
  title: string;
  template: string;
  status: string;
  targetAmount: number;
  saved: number;
  remaining: number;
  progressPercent: number;
  /** 0~1 — 진척 막대용(서버가 준다, 화면이 나누지 않는다) */
  progressRatio: number;
  /** saved · remaining — 진척 50% 기준(FR-9) */
  frame: string;
  targetDate: string | null;
  monthlyPlan: number | null;
  includeInterest: boolean;
  annualRate: string | null;
  depositCount: number;
  lastDepositedOn: string | null;
  createdAt: string;
  completedAt: string | null;
  milestone: SavingsMilestoneVM;
  projection: SavingsProjectionVM;
  /** 서버가 구간을 못 계산했다 — projection 은 계획값만. BFF 는 지우지 않고 전달한다(`bff-architecture.md` §5) */
  degraded: boolean;
  degradedReasons: string[];
  /** 모이는 장면(S1b) — kind 로 그림, step/steps 로 칸. 서버가 정한다 */
  scene: SavingsSceneVM;
  /** 도장 수 — 첫 도장 + 직접 넣은 적립 */
  stampCount: number;
  /** 다 찬 목표만 */
  postcard: SavingsPostcardVM | null;
  /** 첫 실물 단위의 환산 한 줄. 없으면 null */
  unitLine: SavingsUnitVM | null;
  /** 기한 모드: 지금 월 계획대로면 기한 안에 닿나. 기한 없으면 null */
  planMeetsDeadline: boolean | null;
}

export interface SavingsSceneVM {
  /** trip · car · umbrella · house · jar */
  kind: string;
  step: number;
  steps: number;
}

export interface SavingsUnitVM {
  id: string;
  name: string;
  unitPrice: number;
  /** 모은 돈으로 몇 개(서버 내림) */
  count: number;
}

export interface SavingsPostcardVM {
  startedOn: string;
  reachedOn: string;
  daysTaken: number;
  depositCount: number;
}

export interface SavingsMissedMonthsVM {
  observedMonths: number;
  skippedMonths: number;
  /** 건너뛴 달을 계획만큼 넣었다면 계획 도달이 몇 달 빨랐을지. 없으면 null + reason */
  shiftMonths: number | null;
  reason: string | null;
}

export interface SavingsSimProjectionVM {
  method: string;
  earlyMonth: string | null;
  lateMonth: string | null;
  planMonth: string | null;
  reason: string | null;
}

export interface SavingsSimulationVM {
  totalMonthlyBefore: number;
  totalMonthlyAfter: number;
  rows: Array<{
    goalId: string;
    title: string;
    template: string;
    monthlyBefore: number | null;
    monthlyAfter: number | null;
    before: SavingsSimProjectionVM;
    after: SavingsSimProjectionVM;
    /** + 늦어짐 · − 빨라짐 */
    planShiftMonths: number | null;
    /** "2027-12"(기한 모드만) · 바꾼 계획대로면 기한 안에 닿나 */
    deadlineMonth: string | null;
    afterMeetsDeadline: boolean | null;
  }>;
}

export interface SavingsEmergencyVM {
  amount: number;
  withdraw: { planMonthBefore: string | null; planMonthAfter: string | null; delayMonths: number | null; reason: string | null };
  /** firstPayment × firstMonths + restPayment × restMonths = 원금 + totalInterest — 서버 값. 나누어떨어지면 restMonths 0 */
  loan: { months: number; annualRate: string; firstPayment: number; firstMonths: number; restPayment: number; restMonths: number; totalInterest: number } | null;
  /** 나눌 수 없으면(`amount_too_small`) — 꺼내기 칸은 그대로 */
  loanReason: string | null;
  /** 가정 키 — 문장은 프론트(`loan_paid_outside_goal`) */
  assumptions: string[];
}

export interface SavingsDepositVM {
  id: string;
  amount: number;
  depositedOn: string;
  note: string | null;
  splitGroupId: string | null;
  source: string;
}

export interface SavingsGoalDetailVM {
  goal: SavingsGoalVM;
  /** 이 응답 어디든 계산이 불완전하면 true — goal.degraded(구간) + 상세 칸(놓친 달 `missed_months`) */
  degraded: boolean;
  degradedReasons: string[];
  plan: SavingsCalculationVM;
  deposits: SavingsDepositVM[];
  /** 놓친 달 회고(S1b) */
  missedMonths: SavingsMissedMonthsVM;
  /** 이 목표의 실물 단위 전부 */
  units: SavingsUnitVM[];
  /** 목표 하나에 둘 수 있는 단위 수(서버 상한) */
  unitLimit: number;
}

export interface SavingsSplitVM {
  splitGroupId: string | null;
  goals: SavingsGoalDetailVM[];
}

/** 홈 카드가 쓰는 서버 숫자(`GET /savings/home-card`) */
export interface SavingsHomeCardSource {
  totalGoals: number;
  activeGoals: number;
  totalSaved: number | null;
  nearest: { goalId: string; title: string; template: string; progressPercent: number; milestone: SavingsMilestoneVM } | null;
}

/** 목표 시계 서버 숫자(`GET /savings/goal-clock`) — 목표가 없거나 계획이 없으면 delayDays null + reason */
export interface SavingsGoalClockSource {
  goalId: string | null;
  title: string | null;
  template: string | null;
  delayDays: number | null;
  /** no_active_goal · no_plan · null */
  reason: string | null;
}

/** 쓰기는 재시도하지 않는다(중복 적립). 조회 예산 — 목록 300ms 서버 예산 + 여유 */
const READ_TIMEOUT_MS = 2_000;
const WRITE_TIMEOUT_MS = 5_000;

const data = <T>(response: { data?: { data?: unknown } }): T => response.data?.data as T;

class AppSavingsService {
  async templates(token: string): Promise<SavingsTemplateVM[]> {
    return data(await backendApi.proxyAuthRequest("GET", "/savings/templates", token, undefined, { timeout: READ_TIMEOUT_MS }));
  }

  async goals(token: string): Promise<SavingsGoalVM[]> {
    return data(await backendApi.proxyAuthRequest("GET", "/savings/goals", token, undefined, { timeout: READ_TIMEOUT_MS }));
  }

  async goal(token: string, id: string): Promise<SavingsGoalDetailVM> {
    return data(await backendApi.proxyAuthRequest("GET", `/savings/goals/${encodeURIComponent(id)}`, token, undefined, { timeout: READ_TIMEOUT_MS }));
  }

  async calculate(token: string, body: unknown): Promise<SavingsCalculationVM> {
    return data(await backendApi.proxyAuthRequest("POST", "/savings/calculate", token, body, { timeout: READ_TIMEOUT_MS }));
  }

  async create(token: string, body: unknown): Promise<SavingsGoalDetailVM> {
    return data(await backendApi.proxyAuthRequest("POST", "/savings/goals", token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async deposit(token: string, id: string, body: unknown): Promise<SavingsGoalDetailVM> {
    return data(
      await backendApi.proxyAuthRequest("POST", `/savings/goals/${encodeURIComponent(id)}/deposits`, token, body, { timeout: WRITE_TIMEOUT_MS }),
    );
  }

  async split(token: string, body: unknown): Promise<SavingsSplitVM> {
    return data(await backendApi.proxyAuthRequest("POST", "/savings/deposits/split", token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  /** 저울 — 저장하지 않는 계산(조회 예산). 서버 예산 300ms */
  async simulate(token: string, body: unknown): Promise<SavingsSimulationVM> {
    return data(await backendApi.proxyAuthRequest("POST", "/savings/simulate", token, body, { timeout: READ_TIMEOUT_MS }));
  }

  /** 저울 확정 — 쓰기(재시도 없음). 응답은 목록 전체 */
  async updatePlans(token: string, body: unknown): Promise<SavingsGoalVM[]> {
    return data(await backendApi.proxyAuthRequest("PUT", "/savings/goals/plans", token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async emergency(token: string, id: string, body: unknown): Promise<SavingsEmergencyVM> {
    return data(
      await backendApi.proxyAuthRequest("POST", `/savings/goals/${encodeURIComponent(id)}/emergency-compare`, token, body, { timeout: READ_TIMEOUT_MS }),
    );
  }

  async addUnit(token: string, id: string, body: unknown): Promise<SavingsGoalDetailVM> {
    return data(await backendApi.proxyAuthRequest("POST", `/savings/goals/${encodeURIComponent(id)}/units`, token, body, { timeout: WRITE_TIMEOUT_MS }));
  }

  async deleteUnit(token: string, id: string, unitId: string): Promise<SavingsGoalDetailVM> {
    return data(
      await backendApi.proxyAuthRequest(
        "DELETE",
        `/savings/goals/${encodeURIComponent(id)}/units/${encodeURIComponent(unitId)}`,
        token,
        undefined,
        { timeout: WRITE_TIMEOUT_MS },
      ),
    );
  }

  /**
   * 목표 시계(`SRV-REQ-045` FR-17) — 지출 금액만큼 덜 모으면 가장 가까운 목표가 며칠 늦어지나. 가계부 저장 응답이 붙인다(`app-household.service.ts`).
   * 금액은 서버 숫자(가계부 `savedTotal`) 그대로 문자열로 넘긴다
   */
  async goalClock(token: string, amount: string, timeout: number): Promise<SavingsGoalClockSource> {
    return data(
      await backendApi.proxyAuthRequest("GET", `/savings/goal-clock?amount=${encodeURIComponent(amount)}`, token, undefined, { timeout }),
    );
  }

  async homeCard(token: string, timeout: number): Promise<SavingsHomeCardSource> {
    return data(await backendApi.proxyAuthRequest("GET", "/savings/home-card", token, undefined, { timeout }));
  }
}

export const appSavingsService = new AppSavingsService();
