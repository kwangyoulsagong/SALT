import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { afterEach, describe, it, mock } from "node:test";

import { backendApi } from "../backend-api.service";
import { coachConversationService, toCoachCard, toCoachMessage, toLinks, type CoachStreamEvent } from "../coach-conversation.service";
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
  it("링크 — 적립 화면(`plan`, 2026-11-19)은 지나가고 모르는 종류는 걸러진다", () =>
    assert.deepEqual(toLinks([{ kind: "plan" }, { kind: "unknown" }]), [{ kind: "plan" }]));
});

describe("SSE 파서 id", () => {
  it("id: 를 실어 주고 없으면 키가 없다(기존 소비처 모양 그대로)", () => {
    const out: unknown[] = [];
    const parse = createSseParser((e) => out.push(e));
    parse("id: 3\nevent: a\ndata: 1\n\nevent: b\ndata: 2\n\n");
    assert.deepEqual(out, [{ event: "a", data: "1", id: "3" }, { event: "b", data: "2" }]);
  });
});

/** 서버 카드(게이트 통과) — 코치 상세 `recommendation` 과 같은 모양 + `generatedAt` */
const serverCard = () => ({
  action: "hold", symbol: "BTC", assetType: "crypto", score: 55, scoreNote: "점수는 확률이 아닙니다",
  renderable: true, blockedReason: null, reasons: [{ type: "trend", message: "추세 유지" }], topFactors: [],
  signalTrackRecord: { signalType: "coach.hold", sample: 24, winRate: 0.6, avgReturn: 0.01, worstObservedReturn: -0.1, lowSample: false, horizonHours: 720, alwaysUpRate: null, excessWinRate: null, claim: null },
  failureCases: [{ date: "2026-10-01", event: "coach.hold", outcome: "miss", symbol: "ETH", returnRate: -0.08 }],
  explanation: { text: "보유 유지", source: "rule" }, generatedAt: "2026-11-18T08:00:00.000Z",
});

describe("추천 카드(2단계 · BFF-REQ-027 FR-3 · 42 · BFF-REQ-028 FR-3 · 4)", () => {
  afterEach(() => mock.restoreAll());

  it("카드는 한 이벤트로 옮기고(id 그대로) 리포트 추천과 같은 모양 + 판단 시각", async () => {
    mock.method(backendApi, "openAuthStream", async () =>
      sse(
        `id: 0\nevent: message.delta\ndata: {"text":"한 문장"}\n\n`,
        `id: 1\nevent: message.card\ndata: ${JSON.stringify(serverCard())}\n\n`,
        `event: message.done\ndata: {"messageId":"${MID}","intent":"sell_check","explanationSource":"rule","links":[],"gaps":[],"replayed":false}\n\n`
      ) as never
    );
    const events: CoachStreamEvent[] = [];
    await coachConversationService.streamAnswer("t", MID, undefined, (e) => events.push(e));
    assert.deepEqual(events.map((e) => e.event), ["message.delta", "message.card", "message.done"]);
    const card = events[1] as Extract<CoachStreamEvent, { event: "message.card" }>;
    assert.equal(card.id, "1");
    assert.equal(card.data.renderable, true);
    assert.equal(card.data.generatedAt, "2026-11-18T08:00:00.000Z");
    if (card.data.renderable) assert.equal(card.data.symbol, "BTC");
  });

  it("3종이 빈 '통과' 카드 · 깨진 카드는 보내지 않는다 — 게이트 칸을 채우지 않는다", async () => {
    const noFailures = { ...serverCard(), failureCases: [] };
    mock.method(backendApi, "openAuthStream", async () =>
      sse(`event: message.card\ndata: ${JSON.stringify(noFailures)}\n\n`, `event: message.card\ndata: "x"\n\n`) as never
    );
    const events: CoachStreamEvent[] = [];
    await coachConversationService.streamAnswer("t", MID, undefined, (e) => events.push(e));
    assert.deepEqual(events, []);
  });

  it("막힌 카드 — 사유 · 표본만(행동 · 종목 없음)", () => {
    const card = toCoachCard({
      renderable: false, blockedReason: "insufficient_sample", signalTrackRecord: { signalType: "coach.buy", sample: 3 }, failureCases: [],
      generatedAt: "2026-11-18T08:00:00.000Z", action: "buy", symbol: "BTC",
    });
    assert.deepEqual(card, { renderable: false, blockedReason: "insufficient_sample", trackSample: 3, generatedAt: "2026-11-18T08:00:00.000Z" });
  });

  it("메시지 목록 — 답에만 카드, 질문 줄 카드는 버린다", () => {
    const base = { content: "x", status: "complete", explanationSource: "rule", links: [], gaps: [], errorCode: null, createdAt: "2026-11-18T00:00:00.000Z" };
    assert.equal(toCoachMessage({ ...base, id: "a", role: "assistant", card: serverCard() }).card?.renderable, true);
    assert.equal(toCoachMessage({ ...base, id: "q", role: "user", card: serverCard() }).card, null);
    assert.equal(toCoachMessage({ ...base, id: "b", role: "assistant" }).card, null);
  });

  it("브리핑 — 서버 문장 그대로 · 카드 · 모르는 링크 버림", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () =>
      ({
        data: {
          success: true,
          data: { generatedAt: "2026-11-18T09:00:00.000Z", sentences: ["오늘의 브리핑이에요.", ""], links: [{ kind: "profit_plan" }, { kind: "buy" }], gaps: ["risk"], card: serverCard(), explanationSource: "rule" },
        },
      }) as never
    );
    const view = await coachConversationService.briefing("t");
    assert.deepEqual(call.mock.calls[0].arguments.slice(0, 2), ["GET", "/coach/briefing"]);
    assert.deepEqual(view.sentences, ["오늘의 브리핑이에요."]);
    assert.deepEqual(view.links, [{ kind: "profit_plan" }]);
    assert.deepEqual(view.gaps, ["risk"]);
    assert.equal(view.card?.renderable, true);
  });
});

describe("메시지 목록 — 커서 · 보관 한도(BFF-REQ-028 · 2026-11-19)", () => {
  const CONV = "3ebf1065-81c3-466d-867a-49c3b445d3a9";
  afterEach(() => mock.restoreAll());

  it("틀린 커서는 버리지 않고 400 — 버리면 첫 쪽이 다시 와 화면이 같은 쪽을 끝없이 붙였다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ({ data: { data: { items: [], nextCursor: null } } }) as never);
    for (const cursor of ["qa049-1-abc", "not-a-uuid", 42]) {
      await assert.rejects(coachConversationService.listMessages("t", CONV, { cursor }), (error: { statusCode?: number; code?: string }) =>
        error.statusCode === 400 && error.code === "INVALID_CURSOR");
    }
    assert.equal(call.mock.callCount(), 0);
  });

  it("커서가 없거나 비면 첫 쪽 · 맞는 커서는 그대로 서버로", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ({ data: { data: { items: [], nextCursor: null } } }) as never);
    await coachConversationService.listMessages("t", CONV, {});
    await coachConversationService.listMessages("t", CONV, { cursor: "" });
    await coachConversationService.listMessages("t", CONV, { cursor: CONV });
    const paths = call.mock.calls.map((c) => c.arguments[1]);
    assert.deepEqual(paths, [
      `/coach/conversations/${CONV}/messages`,
      `/coach/conversations/${CONV}/messages`,
      `/coach/conversations/${CONV}/messages?cursor=${CONV}`,
    ]);
  });

  it("보관 한도는 양의 정수 둘일 때만 옮기고, 아니면 null", async () => {
    const reply = (keep: unknown) =>
      mock.method(backendApi, "proxyAuthRequest", async () => ({ data: { data: { items: [], nextCursor: null, keep } } }) as never);
    reply({ questions: 100, days: 90 });
    assert.deepEqual((await coachConversationService.listMessages("t", CONV, {})).keep, { questions: 100, days: 90 });
    for (const bad of [undefined, null, { questions: 0, days: 90 }, { questions: "100", days: 90 }, { questions: 1.5, days: 90 }, []]) {
      mock.restoreAll();
      reply(bad);
      assert.equal((await coachConversationService.listMessages("t", CONV, {})).keep, null);
    }
  });
});
