import { describe, expect, it } from "vitest";

import { createSseParser, formatSseEvent, type SseEvent } from "./parser";

describe("createSseParser", () => {
  it("바이트가 어디서 끊겨 와도 이벤트 단위로 모은다", () => {
    const events: SseEvent[] = [];
    const parse = createSseParser((e) => events.push(e));
    for (const ch of formatSseEvent("message.delta", '{"text":"가나"}') + formatSseEvent("ping", "{}")) parse(ch);
    expect(events).toEqual([
      { event: "message.delta", data: '{"text":"가나"}' },
      { event: "ping", data: "{}" },
    ]);
  });

  it("CRLF · 여러 줄 data · 주석", () => {
    const events: SseEvent[] = [];
    createSseParser((e) => events.push(e))(": c\r\nevent: x\r\ndata: a\r\ndata: b\r\n\r\n");
    expect(events).toEqual([{ event: "x", data: "a\nb" }]);
  });
});
