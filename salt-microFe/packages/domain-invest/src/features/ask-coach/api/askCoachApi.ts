import type { CoachAskResult, CoachQuestionChip } from "@repo/core/coach";

import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

/** 코치 대화 BFF 경로(F006 C절 · `BFF-REQ-028`) */
const ASK_ENDPOINT = "/api/app/coach/messages";
export const answerStreamUrl = (messageId: string) =>
  `${INVESTMENTS_BASE_URL}${ASK_ENDPOINT}/${encodeURIComponent(messageId)}/stream`;

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * 묻기 — 질문 · 답 자리만 저장되고 바로 돌아온다(답은 `answerStreamUrl` 스트림). 주문이 아니다 — 주문을 내는 경로는 없다.
 */
export const askCoachApi = {
  ask: async (body: { conversationId: string | null; content: string | null; chip: CoachQuestionChip | null }): Promise<CoachAskResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${ASK_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await readApiError(response, "ask coach");
    return ((await response.json()) as Envelope<CoachAskResult>).data;
  },
};
