import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSseParser, formatSseEvent, type SseEvent } from "../sse.util";

describe("createSseParser", () => {
  it("바이트가 어디서 끊겨 와도 이벤트 단위로 모은다", () => {
    const events: SseEvent[] = [];
    const parse = createSseParser((e) => events.push(e));
    const wire = formatSseEvent("message.delta", '{"text":"가나"}') + formatSseEvent("message.done", "{}");
    for (const ch of wire) parse(ch);
    assert.deepEqual(events, [
      { event: "message.delta", data: '{"text":"가나"}' },
      { event: "message.done", data: "{}" },
    ]);
  });

  it("CRLF · 여러 줄 data · 주석을 명세대로 다룬다", () => {
    const events: SseEvent[] = [];
    const parse = createSseParser((e) => events.push(e));
    parse(": 주석\r\nevent: x\r\ndata: a\r\ndata: b\r\n\r\n");
    assert.deepEqual(events, [{ event: "x", data: "a\nb" }]);
  });
});
