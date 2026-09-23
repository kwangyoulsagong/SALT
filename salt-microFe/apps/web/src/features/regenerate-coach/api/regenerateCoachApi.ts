import type { CoachGenerationAccepted } from "@repo/core/coach";

import { apiFetch, authHeader } from "@/shared/api";
import { HTTP_STATUS_CODE, INVESTMENTS_BASE_URL } from "@/shared/config";

/** 서버 경로를 그대로 옮기는 BFF 프록시(`/api/*`)다. 뷰모델 경로(`/api/app/*`)가 아니다 */
const GENERATE_ENDPOINT = "/api/ai-coach/generate";

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** 202 = 받았다 · 429 = 쿨다운. 둘 다 **결과**다 — 쿨다운은 에러로 던지지 않는다(FR-76) */
export type RegenerateResult =
  | { kind: "accepted"; accepted: CoachGenerationAccepted }
  | { kind: "cooldown"; retryAfterSeconds: number };

export class RegenerateCoachApiError extends Error {
  constructor(readonly status: number) {
    super(`regenerate coach ${status}`);
  }
}

/**
 * 코치 재생성 요청 (`FE-REQ-028` FR-20 · FR-24).
 *
 * 429 본문의 `retryAfterSeconds` 는 BFF 가 그대로 옮긴다(`BFF-REQ-025` FR-6). 본문에 없으면
 * `Retry-After` 헤더를 본다 — 둘 다 없으면 에러로 둔다(남은 시간을 지어내지 않는다).
 */
export const regenerateCoachApi = {
  generate: async (): Promise<RegenerateResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${GENERATE_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({}),
    });

    if (response.status === HTTP_STATUS_CODE.TOO_MANY_REQUESTS) {
      const body = (await response.json().catch(() => null)) as {
        retryAfterSeconds?: unknown;
      } | null;
      const fromBody = body?.retryAfterSeconds;
      const header = response.headers.get("Retry-After");
      // `Number(null)` 은 0 이다 — 헤더가 없는 것을 "지금 가능"으로 읽지 않게 먼저 거른다
      const seconds =
        typeof fromBody === "number" ? fromBody : header === null ? NaN : Number(header);
      if (Number.isInteger(seconds) && seconds >= 0) {
        return { kind: "cooldown", retryAfterSeconds: seconds };
      }
      throw new RegenerateCoachApiError(response.status);
    }
    if (!response.ok) throw new RegenerateCoachApiError(response.status);

    const envelope = (await response.json()) as Envelope<CoachGenerationAccepted>;
    return { kind: "accepted", accepted: envelope.data };
  },
};
