/**
 * SSE 조각 파서 — 바이트가 어디서 끊겨 와도 이벤트 단위로 모은다(`streaming-sse.md` §2 중계).
 *
 * 빈 줄(`\n\n`)이 이벤트 끝이다. `data:` 가 여러 줄이면 `\n` 으로 잇는다(SSE 명세).
 * 주석(`:`)과 `id:` · `retry:` 는 버린다 — 우리 계약에 없다.
 */
export interface SseEvent {
  event: string;
  data: string;
}

export const createSseParser = (onEvent: (event: SseEvent) => void) => {
  let buffer = "";

  const flush = (block: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (data.length > 0) onEvent({ event, data: data.join("\n") });
  };

  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, "\n");
    let end = buffer.indexOf("\n\n");
    while (end !== -1) {
      flush(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
      end = buffer.indexOf("\n\n");
    }
  };
};

export const formatSseEvent = (event: string, data: string) => `event: ${event}\ndata: ${data}\n\n`;
