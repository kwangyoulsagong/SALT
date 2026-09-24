import { createSseParser, type SseEvent } from "@repo/core/sse";

import { apiFetch } from "./apiFetch";

/** 스트림을 열기 전에 온 HTTP 오류 — 화면은 `status` 하나로 가른다(429 잠시 후 · 나머지 규칙 기반) */
export class StreamHttpError extends Error {
  constructor(readonly status: number) {
    super(`stream http ${status}`);
  }
}

/**
 * POST SSE 스트림을 읽는다 — `EventSource` 는 GET 전용이라 `fetch` 본문을 직접 읽는다.
 *
 * - `apiFetch` 를 지나므로 401 이면 토큰을 갱신하고 한 번 다시 연다(스트림을 열기 전의 일이다)
 * - `ping` 은 여기서 버린다 — 연결 유지용이다
 * - `signal` 로 끊으면 읽기를 멈추고 BFF → 서버 → LLM 까지 끊긴다(`streaming-sse.md` §4)
 * - 끝나면(서버가 닫으면) resolve. 읽는 도중 끊긴 연결은 reject
 */
export const streamSse = async (
  url: string,
  init: { body: unknown; headers?: Record<string, string>; signal: AbortSignal },
  onEvent: (event: SseEvent) => void,
): Promise<void> => {
  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...init.headers },
    body: JSON.stringify(init.body),
    signal: init.signal,
  });
  if (!response.ok || !response.body) throw new StreamHttpError(response.status);

  const parse = createSseParser((event) => {
    if (event.event !== "ping") onEvent(event);
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parse(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }
};
