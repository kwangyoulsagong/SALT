import { EXPLAIN_STREAM_EVENT_NAMES, type ExplainStreamEvent } from "@repo/core/coach";

import { authHeader, streamSse } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import type { ExplainSymbolRequest } from "../model";

const EXPLAIN_STREAM_ENDPOINT = "/api/app/ai-coach/explain/stream";

/** BFF 대화당 상한(60s)과 같다 — 그 뒤에는 BFF 가 먼저 끊는다 */
export const EXPLAIN_STREAM_TIMEOUT_MS = 60_000;

/**
 * 해설 스트림을 연다. 모양이 깨진 이벤트 · 모르는 이름은 버린다 — 계약 밖의 것을 그리지 않는다.
 */
export const explainStreamApi = {
  open: (body: ExplainSymbolRequest, signal: AbortSignal, onEvent: (event: ExplainStreamEvent) => void) =>
    streamSse(
      `${INVESTMENTS_BASE_URL}${EXPLAIN_STREAM_ENDPOINT}`,
      { body, headers: authHeader(), signal },
      ({ event, data }) => {
        if (!EXPLAIN_STREAM_EVENT_NAMES.has(event as ExplainStreamEvent["event"])) return;
        try {
          onEvent({ event, data: JSON.parse(data) } as ExplainStreamEvent);
        } catch {
          // 깨진 JSON 한 조각 — 버린다. 스트림은 계속된다
        }
      },
    ),
};
