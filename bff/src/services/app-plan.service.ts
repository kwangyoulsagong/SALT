import { backendApi } from "./backend-api.service";
import {
  toCompleteWeeklyPlanViewModel,
  toMonthlySummaryViewModel,
  toPlanSettingsViewModel,
  toWeeklyPlanViewModel,
  type CompleteWeeklyPlanInput,
  type CompleteWeeklyPlanVM,
  type MonthlySummaryVM,
  type PlanSettingsVM,
  type WeeklyPlanVM,
} from "./plan.viewmodel";

/**
 * 서버 `plan` 호출 예산(`BFF-REQ-021` 호출 맵 개정 2026-11-19). 김프 · 성적 · 실패 사례는 `weekly` 한 응답이라 따로 부르지 않는다.
 * 읽기는 서버가 빠진 지난 주를 한 번에 채우는 첫 회차(쓰기)가 있어 화면 조회보다 넉넉히. **쓰기는 재시도 0** — `backendApi` 는 재시도하지 않는다
 */
export const PLAN_READ_TIMEOUT_MS = 1_500;
const PLAN_WRITE_TIMEOUT_MS = 3_000;

const dataOf = (response: { data?: unknown }): unknown => (response.data as { data?: unknown } | undefined)?.data;

class AppPlanService {
  /** 이번 주 계획 — 금액 · 배수 · 관문 · 3종 · 김프 · 연속 전부 서버 값. 실패는 상태 코드 그대로(화면 블록이 다시 부른다) */
  async getWeekly(token: string, timeout = PLAN_READ_TIMEOUT_MS): Promise<WeeklyPlanVM> {
    const response = await backendApi.proxyAuthRequest("GET", "/plan/weekly", token, undefined, { timeout });
    return toWeeklyPlanViewModel(dataOf(response));
  }

  /** 이번 주 적립 완료(수동 체크만). 서버 422(`PLAN_*`)는 error middleware 가 코드 · `min` · `max` 그대로 옮긴다 */
  async complete(token: string, input: CompleteWeeklyPlanInput): Promise<CompleteWeeklyPlanVM> {
    const response = await backendApi.proxyAuthRequest("POST", "/plan/weekly/complete", token, input, { timeout: PLAN_WRITE_TIMEOUT_MS });
    return toCompleteWeeklyPlanViewModel(dataOf(response));
  }

  async getSettings(token: string): Promise<PlanSettingsVM> {
    const response = await backendApi.proxyAuthRequest("GET", "/plan/settings", token, undefined, { timeout: PLAN_READ_TIMEOUT_MS });
    return toPlanSettingsViewModel(dataOf(response));
  }

  /** 월 적립액 저장 — 본문은 받은 그대로(밴드 키가 있으면 서버가 422 `PLAN_BAND_READ_ONLY` — 조용히 걸러 성공시키지 않는다, FR-62) */
  async updateSettings(token: string, body: Record<string, unknown>): Promise<PlanSettingsVM> {
    const response = await backendApi.proxyAuthRequest("PATCH", "/plan/settings", token, body, { timeout: PLAN_WRITE_TIMEOUT_MS });
    return toPlanSettingsViewModel(dataOf(response));
  }

  async getMonthlySummary(token: string, month: string | null): Promise<MonthlySummaryVM> {
    const query = month ? `?month=${encodeURIComponent(month)}` : "";
    const response = await backendApi.proxyAuthRequest("GET", `/plan/monthly-summary${query}`, token, undefined, { timeout: PLAN_READ_TIMEOUT_MS });
    return toMonthlySummaryViewModel(dataOf(response));
  }
}

export const appPlanService = new AppPlanService();
