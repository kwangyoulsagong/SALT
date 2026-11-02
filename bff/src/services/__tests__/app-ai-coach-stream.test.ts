import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { afterEach, describe, it, mock } from "node:test";

import { formatSseEvent } from "../../utils/sse.util";
import { appAICoachService } from "../app-ai-coach.service";
import { backendApi } from "../backend-api.service";

const drain = async (opened: Awaited<ReturnType<typeof appAICoachService.openExplainStream>>) => {
  const names: string[] = [];
  for await (const e of opened.events) names.push(e.event);
  return names;
};

describe("openExplainStream (BFF-REQ-037 FR-6)", () => {
  afterEach(() => mock.restoreAll());

  it("계약에 있는 이벤트만 옮기고, 다 읽으면 동시 상한 문이 다시 열린다", async () => {
    mock.method(backendApi, "openAuthStream", async () =>
      Readable.from([
        formatSseEvent("message.start", "{}"),
        formatSseEvent("debug.raw", '{"prompt":"비밀"}'),
        formatSseEvent("message.delta", '{"text":"a"}') + formatSseEvent("message.done", "{}"),
      ]),
    );
    for (let i = 0; i < 3; i += 1) {
      const names = await drain(await appAICoachService.openExplainStream("t", {}, new AbortController().signal));
      assert.deepEqual(names, ["message.start", "message.delta", "message.done"]);
    }
  });

  it("서버 4xx 는 스트림을 열기 전에 그대로 던지고 문을 연다", async () => {
    mock.method(backendApi, "openAuthStream", async () => {
      throw Object.assign(new Error("upstream 429"), { response: { status: 429, data: {} } });
    });
    for (let i = 0; i < 3; i += 1) {
      await assert.rejects(appAICoachService.openExplainStream("t", {}, new AbortController().signal), /429/);
    }
  });

  it("동시 2개를 넘으면 서버에 보내지 않고 429", async () => {
    const calls: unknown[] = [];
    mock.method(backendApi, "openAuthStream", async () => {
      calls.push(1);
      return new Readable({ read() {} });
    });
    const a = await appAICoachService.openExplainStream("t", {}, new AbortController().signal);
    const b = await appAICoachService.openExplainStream("t", {}, new AbortController().signal);
    await assert.rejects(appAICoachService.openExplainStream("t", {}, new AbortController().signal), /explain_busy/);
    assert.equal(calls.length, 2);
    a.close();
    b.close();
  });

  it("서버로 BFF 가 정한 클라이언트를 싣는다 — 기본 web · 앱이면 mobile (BFF-REQ-050 FR-1)", async () => {
    const seen: Array<Record<string, string> | undefined> = [];
    mock.method(backendApi, "openAuthStream", async (_u: string, _t: string, _d: unknown, o: { headers?: Record<string, string> }) => {
      seen.push(o.headers);
      return Readable.from([formatSseEvent("message.done", "{}")]);
    });
    await drain(await appAICoachService.openExplainStream("t", {}, new AbortController().signal));
    await drain(await appAICoachService.openExplainStream("t", {}, new AbortController().signal, "mobile"));
    assert.deepEqual(seen, [{ "X-Salt-Client": "web" }, { "X-Salt-Client": "mobile" }]);
  });

  it("provider 칸은 데이터 그대로 지난다 — 이름 허용 목록 중계 (BFF-REQ-050 FR-2)", async () => {
    const replace = '{"modeReasoning":"a","keyDrivers":[],"risks":[],"newsSummary":[],"source":"llm","droppedSentences":0,"provider":"local_claude"}';
    const done = '{"messageId":"m","source":"llm","droppedSentences":0,"provider":"local_claude","generatedAt":"t"}';
    mock.method(backendApi, "openAuthStream", async () =>
      Readable.from([formatSseEvent("message.replace", replace) + formatSseEvent("message.done", done)]),
    );
    const opened = await appAICoachService.openExplainStream("t", {}, new AbortController().signal);
    const got: string[] = [];
    for await (const e of opened.events) got.push(e.data);
    assert.deepEqual(got, [replace, done]);
  });
});
