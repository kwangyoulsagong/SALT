import type { TradePreflightRequest, TradePreflightView } from "@repo/core/coach";

import { apiFetch, authHeader, readApiError } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

/** F004 BFF 경로(`BFF-REQ-024`) */
const ENDPOINT = "/api/app/trade-preflight";

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * 주문 전 체크 (F004 FR-30 · `FE-REQ-026` FR-150~156).
 *
 * **계산일 뿐 주문이 아니다** — 저장도 하지 않는다. 금액 · 비율 · 손절 칩의 가격 환산은 전부 서버가 한다.
 * 입력이 바뀌면 이전 요청을 끊는다(`signal`).
 */
export const runPreflightApi = {
  check: async (body: TradePreflightRequest, signal?: AbortSignal): Promise<TradePreflightView> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) throw await readApiError(response, "trade preflight");
    const envelope = (await response.json()) as Envelope<TradePreflightView>;
    return envelope.data;
  },
};
