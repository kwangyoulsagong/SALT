import { PLAN_API_BASE, type PlanSettingsVM } from "@/entities/plan";
import { apiFetch, readApiError } from "@repo/web-shared/api";

/**
 * 월 적립액 저장 — 본문은 `{ monthlyBaseKrw }` 하나(타입에 밴드 · 배수 · 임계 칸이 없다, `FE-REQ-024` FR-12).
 * 하한 · 상한 · 단위 검사는 서버 422 — 프론트는 숫자 형식만 본다(FR-41)
 */
export const savePlanSettings = async (body: { monthlyBaseKrw: number }): Promise<PlanSettingsVM> => {
  const response = await apiFetch(`${PLAN_API_BASE}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await readApiError(response, "plan settings");
  return ((await response.json()) as { data: PlanSettingsVM }).data;
};
