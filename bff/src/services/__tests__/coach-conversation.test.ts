import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { afterEach, describe, it, mock } from "node:test";

import { backendApi } from "../backend-api.service";
import { coachConversationService, toCoachMessage, toLinks, type CoachStreamEvent } from "../coach-conversation.service";
import { createSseParser } from "../../utils/sse.util";

/** 코치 대화 중계(F006 C절 · `BFF-REQ-027` · `028`) — 모양 좁히기 · 이벤트 계약 · 재연결 id */

const MID = "11111111-2222-4333-8444-555555555555";
const sse = (...blocks: string[]) => Readable.from(blocks);

describe("coachConversationService.streamAnswer", () => {
  afterEach(() => mock.restoreAll());

  it("start · delta(id 그대로) · done 을 옮기고 Last-Event-ID 를 서버로", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "openAuthStream", async (...args: unknown[]) => {
      calls.push(args);
      return sse(
        `event: message.start\ndata: {"messageId":"${MID}"}\n\n`,
        `id: 1\nevent: message.delta\ndata: {"text":"둘째 문장"}\n\n`,
        `event: message.done\ndata: {"messageId":"${MID}","intent":"risk_check","explanationSource":"rule","links":[{"kind":"risk_budget"},{"kind":"order"}],"gaps":[],"replayed":true}\n\n`
      ) as never;
    });
    const events: CoachStreamEvent[] = [];
    await coachConversationService.streamAnswer("t", MID, "0", (e) => events.push(e));
    assert.equal(calls[0][0], `/coach/messages/${MID}/stream`);
    assert.deepEqual((calls[0][3] as { headers: unknown }).headers, { "Last-Event-ID": "0" });
    assert.deepEqual(events.map((e) => e.event), ["message.start", "message.delta", "message.done"]);
    assert.deepEqual(events[1], { event: "message.delta", data: { text: "둘째 문장" }, id: "1" });
    const done = events[2] as Extract<CoachStreamEvent, { event: "message.done" }>;
    assert.deepEqual(done.data.links, [{ kind: "risk_budget" }], "모르는 링크 코드는 버린다");
    assert.equal(done.data.replayed, true);
  });

  it("오류 이벤트는 코드 · 대체 문장만", async () => {
    mock.method(backendApi, "openAuthStream", async () =>
      sse(`event: message.error\ndata: {"code":"LLM_TIMEOUT","fallbackText":"지금은 답을 만들지 못했어요."}\n\n`) as never
    );
    const events: CoachStreamEvent[] = [];
    await coachConversationService.streamAnswer("t", MID, undefined, (e) => events.push(e));
    assert.deepEqual(events, [{ event: "message.error", data: { code: "LLM_TIMEOUT", fallbackText: "지금은 답을 만들지 못했어요." } }]);
  });

  it("id 형식이 틀리면 서버를 부르지 않고 400", async () => {
    const open = mock.method(backendApi, "openAuthStream", async () => sse() as never);
    await assert.rejects(coachConversationService.streamAnswer("t", "../admin", undefined, () => undefined), /id 형식/);
    assert.equal(open.mock.callCount(), 0);
  });
});

describe("coachConversationService.ask", () => {
  afterEach(() => mock.restoreAll());

  it("빈 질문 · 모르는 칩은 서버를 부르지 않는다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ({ data: { data: {} } }) as never);
    await assert.rejects(coachConversationService.ask("t", { content: "  ", chip: "buy_now" }), /비었습니다/);
    assert.equal(call.mock.callCount(), 0);
  });

  it("칩만 보내면 칩을 넘기고 답 id 를 돌려준다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () =>
      ({ data: { success: true, data: { conversationId: MID, questionId: "q", messageId: "m" } } }) as never
    );
    const result = await coachConversationService.ask("t", { chip: "risk_check" });
    assert.deepEqual(call.mock.calls[0].arguments.slice(0, 2), ["POST", "/coach/messages"]);
    assert.deepEqual(call.mock.calls[0].arguments[3], { conversationId: null, content: null, chip: "risk_check" });
    assert.deepEqual(result, { conversationId: MID, messageId: "m" });
  });
});

describe("뷰모델", () => {
  it("메시지 — 답은 문장마다 한 줄, 깨진 role 은 계약 오류", () => {
    const view = toCoachMessage({
      id: "a", role: "assistant", content: "첫 문장\n둘째 문장", status: "complete", explanationSource: "rule",
      links: [{ kind: "symbol", symbol: "BTC" }, { kind: "symbol", symbol: "../x" }], gaps: ["risk"], errorCode: null, createdAt: "2026-11-18T00:00:00.000Z",
    });
    assert.deepEqual(view.sentences, ["첫 문장", "둘째 문장"]);
    assert.deepEqual(view.links, [{ kind: "symbol", symbol: "BTC" }]);
    assert.throws(() => toCoachMessage({ id: "a", role: "system", content: "", status: "complete", createdAt: "x" }));
  });

  it("링크 — 배열이 아니면 빈 배열", () => assert.deepEqual(toLinks(null), []));
});

describe("SSE 파서 id", () => {
  it("id: 를 실어 주고 없으면 키가 없다(기존 소비처 모양 그대로)", () => {
    const out: unknown[] = [];
    const parse = createSseParser((e) => out.push(e));
    parse("id: 3\nevent: a\ndata: 1\n\nevent: b\ndata: 2\n\n");
    assert.deepEqual(out, [{ event: "a", data: "1", id: "3" }, { event: "b", data: "2" }]);
  });
});
