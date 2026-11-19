import { PLAN_API_BASE, type CompleteWeeklyPlanInput, type CompleteWeeklyPlanVM } from "@/entities/plan";
import { apiFetch, readApiError } from "@repo/web-shared/api";

/** 이번 주 적립 완료(수동 체크만 — `ADR-002`). 재시도하지 않는다 — 서버가 같은 주를 덮어 멱등이지만 요청을 겹쳐 만들지 않는다 */
export const completeWeeklyPlan = async (input: CompleteWeeklyPlanInput): Promise<CompleteWeeklyPlanVM> => {
  const response = await apiFetch(`${PLAN_API_BASE}/weekly/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readApiError(response, "plan complete");
  return ((await response.json()) as { data: CompleteWeeklyPlanVM }).data;
};
