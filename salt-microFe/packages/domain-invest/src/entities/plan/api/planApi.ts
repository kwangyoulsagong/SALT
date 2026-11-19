import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { MonthlySummaryVM, PlanSettingsVM, WeeklyPlanVM } from "../model/types";

/** 밴드 적립 조회(F003 v2 · `FE-REQ-024`). 쓰기(완료 체크 · 월 적립액)는 `features/complete-weekly-plan` · `edit-plan-settings` */
export const PLAN_API_BASE = `${INVESTMENTS_BASE_URL}/api/app/plan`;

const get = async <T>(path: string, label: string, signal?: AbortSignal): Promise<T> => {
  const response = await apiFetch(`${PLAN_API_BASE}${path}`, { signal });
  if (!response.ok) throw await readApiError(response, label);
  return ((await response.json()) as { data: T }).data;
};

export const planApi = {
  weekly: (signal?: AbortSignal) => get<WeeklyPlanVM>("/weekly", "plan weekly", signal),
  settings: (signal?: AbortSignal) => get<PlanSettingsVM>("/settings", "plan settings", signal),
  /** 이번 달(KST) — 달을 넘기지 않으면 서버가 오늘 달을 고른다 */
  monthlySummary: (signal?: AbortSignal) => get<MonthlySummaryVM>("/monthly-summary", "plan monthly summary", signal),
};
