import { apiFetch, authHeader, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import type { SavingsGoalDetail } from "@/entities/goal";

import type { AddGoalRequest } from "../model/types";

/** 목표 만들기 — mutation 은 feature 가 갖는다(`fsd-entities.md`). 응답은 서버가 계산한 상세(계획 · 첫 구간) */
export const addGoalApi = {
  create: async (body: AddGoalRequest): Promise<SavingsGoalDetail> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/savings/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await readApiError(response, "savings-add-goal");
    return (await response.json()) as SavingsGoalDetail;
  },
};
