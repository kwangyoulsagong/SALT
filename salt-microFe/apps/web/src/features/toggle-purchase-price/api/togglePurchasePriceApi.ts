import type { CoachProfileSettings } from "@repo/core/coach";

import { COACH_ENDPOINTS, toCoachProfileSettings } from "@/entities/coach";
import { apiFetch, authHeader, readApiError } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** 매입가 숨김 저장 (`PATCH /api/app/ai-coach/profile`, F009 FR-27). 다른 설정은 보내지 않는다 — 빠진 필드는 그대로 */
export const togglePurchasePriceApi = {
  save: async (hidePurchasePrice: boolean): Promise<CoachProfileSettings> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.profile}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ hidePurchasePrice }),
    });
    if (!response.ok) throw await readApiError(response, "toggle purchase price");
    const envelope = (await response.json()) as Envelope<Record<string, unknown>>;
    // 응답 전체를 읽는다 — 캐시에 그대로 들어가므로 숨김만 읽으면 기본 모드 · 기간 칸이 비었다
    return toCoachProfileSettings(envelope.data);
  },
};
