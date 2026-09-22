import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import type { ExplainResult, ExplainSymbolRequest } from "../model";

const EXPLAIN_ENDPOINT = "/api/app/ai-coach/explain";

/** `FE-REQ-028` FR-13 — 20s. BFF 도 20s 에 끊는다(`BFF-REQ-025`) */
export const EXPLAIN_TIMEOUT_MS = 20_000;

interface AppEnvelope<T> {
  success: boolean;
  data: T;
}

/** 상태 코드를 들고 던진다 — 화면이 429(잠시 후 다시)와 나머지(규칙 기반)를 가른다 */
export class ExplainApiError extends Error {
  constructor(
    readonly status: number,
    readonly timedOut = false,
  ) {
    super(timedOut ? "explain timeout" : `explain api ${status}`);
  }
}

/**
 * 즉석 해설. **인증 필수**(슬라이스 5 이후 BFF 가 토큰 없이 401).
 *
 * `signal` 은 부르는 쪽(모드 전환 · 화면 이탈)이 끊는 것이고, 20s 는 여기서 끊는다.
 * `AbortSignal.any` 를 쓰지 않는다 — Safari 17.4 미만에 없다.
 */
export const explainSymbolApi = {
  explain: async (
    body: ExplainSymbolRequest,
    signal: AbortSignal,
  ): Promise<ExplainResult> => {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, EXPLAIN_TIMEOUT_MS);

    try {
      const response = await apiFetch(`${INVESTMENTS_BASE_URL}${EXPLAIN_ENDPOINT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw new ExplainApiError(response.status);

      const envelope = (await response.json()) as AppEnvelope<ExplainResult>;
      return envelope.data;
    } catch (error) {
      if (timedOut) throw new ExplainApiError(0, true);
      throw error;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    }
  },
};
