import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { afterEach, describe, it, mock } from "node:test";

import { appAICoachService, type ExplainStreamEvent } from "../app-ai-coach.service";
import { backendApi } from "../backend-api.service";

/** 해설 스트림 중계(F017 v4 1f · `BFF-REQ-052` FR-7) — 이벤트마다 뷰모델 검사 · 지어내지 않는다 · 끊기면 끝 */

const view = (tier = "latest") => ({
  symbol: "BTC",
  mode: "scalp",
  tier,
  aiGenerated: tier === "latest",
  provider: tier === "latest" ? "local_claude" : null,
  generatedAt: "2026-11-13T06:00:00.000Z",
  sentences: [{ section: "modeReasoning", text: "비트코인은 지켜보는 구간이에요.", citations: [{ id: "judgment", label: "규칙 판단", at: null, url: null }] }],
  disclaimer: "d",
});
const sentence = (section = "keyDrivers") => ({ section, text: "RSI 48 이에요.", citations: [{ id: "rsi", label: "RSI", at: null, url: null }] });
const sse = (...events: Array<[string, unknown]>) =>
  Readable.from(events.map(([e, d]) => `event: ${e}\ndata: ${typeof d === "string" ? d : JSON.stringify(d)}\n\n`));

const run = async (stream: Readable, query: Record<string, unknown> = { symbol: "btc", mode: "scalp" }) => {
  const calls: unknown[][] = [];
  mock.method(backendApi, "openAuthStream", async (...args: unknown[]) => {
    calls.push(args);
    return stream as never;
  });
  const events: ExplainStreamEvent[] = [];
  await appAICoachService.streamExplanation("t", query, (e) => events.push(e));
  return { events, calls };
};

describe("appAICoachService.streamExplanation", () => {
  afterEach(() => mock.restoreAll());

  it("문장 · 끝을 그대로 옮긴다 — 서버 경로 GET · 조용한 시간 30초", async () => {
    const { events, calls } = await run(sse(["sentence", sentence("modeReasoning")], ["sentence", sentence()], ["done", view()]));
    assert.deepEqual(events.map((e) => e.event), ["sentence", "sentence", "done"]);
    assert.equal(calls[0]![0], "/coach/explain/stream?symbol=BTC&mode=scalp");
    assert.deepEqual(calls[0]![3], { method: "GET", timeout: 30_000, signal: undefined });
  });

  it("저장본이면 snapshot 하나 · 만들 수 없으면 fallback", async () => {
    assert.deepEqual((await run(sse(["snapshot", view()]))).events.map((e) => e.event), ["snapshot"]);
    mock.restoreAll();
    const fb = await run(sse(["fallback", view("template")]));
    assert.equal(fb.events[0]!.event, "fallback");
  });

  it("깨진 문장은 그 문장만 버린다 · 깨진 한 벌은 error(문장을 지어내지 않는다)", async () => {
    const { events } = await run(
      sse(["sentence", { section: "advice", text: "x", citations: [] }], ["sentence", sentence()], ["done", { tier: "latest" }], ["sentence", "not-json"]),
    );
    assert.deepEqual(events.map((e) => e.event), ["sentence", "error"]);
    assert.deepEqual(events[1]!.data, { code: "EXPLAIN_CONTRACT" });
  });

  it("서버 error 는 코드만 옮긴다(원문 0)", async () => {
    const { events } = await run(sse(["error", { code: "X", detail: "secret" }]));
    assert.deepEqual(events, [{ event: "error", data: { code: "EXPLAIN_STREAM_FAILED" } }]);
  });

  it("형식이 틀리면 서버를 부르지 않고 400", async () => {
    const spy = mock.method(backendApi, "openAuthStream", async () => sse() as never);
    await assert.rejects(appAICoachService.streamExplanation("t", { symbol: "../x", mode: "scalp" }, () => {}), (e: { statusCode?: number }) => e.statusCode === 400);
    await assert.rejects(appAICoachService.streamExplanation("t", { symbol: "BTC", mode: "day" }, () => {}), (e: { statusCode?: number }) => e.statusCode === 400);
    assert.equal(spy.mock.callCount(), 0);
  });

  it("화면이 떠나면(signal) 끝난다 — 서버가 아직 보내는 중이어도", async () => {
    const endless = new Readable({ read() {} });
    mock.method(backendApi, "openAuthStream", async () => endless as never);
    const aborter = new AbortController();
    const p = appAICoachService.streamExplanation("t", { symbol: "BTC", mode: "scalp" }, () => {}, aborter.signal);
    setTimeout(() => aborter.abort(), 20);
    await p;
  });
});
