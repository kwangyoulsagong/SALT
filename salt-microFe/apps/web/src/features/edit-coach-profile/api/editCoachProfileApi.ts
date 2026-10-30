import type { CoachProfileSettings, CoachProfileUpdate } from "@repo/core/coach";

import { COACH_ENDPOINTS, toCoachProfileSettings } from "@/entities/coach";
import { apiFetch, authHeader, readApiError } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** 코치 설정 저장 (`PATCH /api/app/ai-coach/profile`, F004 FR-12). 바꾼 필드만 보낸다 — 빠진 필드는 그대로 */
export const editCoachProfileApi = {
  save: async (body: CoachProfileUpdate): Promise<CoachProfileSettings> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.profile}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await readApiError(response, "edit coach profile");
    const envelope = (await response.json()) as Envelope<Record<string, unknown>>;
    return toCoachProfileSettings(envelope.data);
  },
};
