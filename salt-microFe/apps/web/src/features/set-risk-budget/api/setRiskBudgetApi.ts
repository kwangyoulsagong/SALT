import type { RiskBudgetResult, RiskBudgetUpdate } from "@repo/core/coach";

import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

const ENDPOINT = "/api/app/coach/risk-budget";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export class SetRiskBudgetApiError extends Error {
  constructor(readonly status: number) {
    super(`set risk budget ${status}`);
  }
}

/** 리스크 예산 저장 (`PUT /api/app/coach/risk-budget`, F009 FR-1~3). 빠진 필드는 그대로, `null` 은 지운다 */
export const setRiskBudgetApi = {
  save: async (body: RiskBudgetUpdate): Promise<RiskBudgetResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${ENDPOINT}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new SetRiskBudgetApiError(response.status);
    const envelope = (await response.json()) as Envelope<RiskBudgetResult>;
    return envelope.data;
  },
};
