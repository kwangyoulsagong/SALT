import type { ConfirmOutcomeTagsRequest, DecisionOutcomeView } from "@repo/core/coach";

import { COACH_ENDPOINTS } from "@/entities/coach";
import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export class ConfirmOutcomeTagsApiError extends Error {
  constructor(readonly status: number) {
    super(`confirm outcome tags ${status}`);
  }
}

/**
 * 청산 한 건의 태그 확정 (`PUT /api/app/coach/outcomes/:id/tags`, F009 FR-18).
 * 빈 배열은 "실수 없음"으로 확정이다. 서버는 자동 후보(원본)를 지우지 않는다.
 */
export const confirmOutcomeTagsApi = {
  confirm: async (id: string, body: ConfirmOutcomeTagsRequest): Promise<DecisionOutcomeView> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.outcomeTags(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ConfirmOutcomeTagsApiError(response.status);
    const envelope = (await response.json()) as Envelope<DecisionOutcomeView>;
    return envelope.data;
  },
};
