import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ExtractedFactRow, FactSourceBody, LlmUsageStore } from "../../domain";
import { ExtractArticleFacts } from "../ExtractArticleFacts";

/** F017 v4 2c — 사실 추출 배치: 검사 통과만 저장 · 실패는 그 본문만 · 상한 · 종류는 사전 */

const NOW = new Date("2026-11-14T03:00:00Z");
const body = (key: string, over: Partial<FactSourceBody> = {}): FactSourceBody => ({
  key, market: "kr", title: "씨티씨바이오 3분기 누적 영업익 182% 증가", publishedAt: new Date("2026-11-13T09:24:00Z"),
  fetchedAt: new Date("2026-11-13T09:30:00Z"), symbols: ["000001"], url: `https://f.example/${key}`, sourceName: "인포스탁데일리",
  paragraphs: ["3분기 누적 영업이익이 52억원으로 전년 동기 대비 182% 늘었다."], via: "rss_direct", ...over,
});

const harness = (opts: { bodies: FactSourceBody[]; output?: (key: string) => string | Error; calls?: number; enabled?: boolean }) => {
  const marks: Array<[string, string]> = [];
  const saved: ExtractedFactRow[] = [];
  let llmCalls = 0;
  const usage: LlmUsageStore = { record: async () => {}, markDropped: async () => {}, usageSince: async () => ({ calls: (opts.calls ?? 0) + llmCalls, tokens: 0 }) };
  const uc = new ExtractArticleFacts({
    sources: {
      pending: async () => opts.bodies,
      mark: async (key, outcome) => void marks.push([key, outcome]),
      kindsOf: async (_m, origin, items) => items.map((i) => (i.title.includes("영업익") ? `earnings${origin === "disclosure" ? ":d" : ""}` : "other")),
    },
    extractor: {
      extract: async (input) => {
        llmCalls += 1;
        const key = opts.bodies.find((b) => input.source.includes(b.paragraphs[0]!))?.key ?? "";
        const o = opts.output?.(key) ?? JSON.stringify([{ who: "씨티씨바이오", what: "3분기 누적 영업이익", amount: 52, unit: "억원", compared_to: "전년 동기 대비", when: "3분기" }]);
        if (o instanceof Error) throw o;
        return { output: o, provider: "local_claude", model: "t" };
      },
    },
    facts: { saveMany: async (rows) => (saved.push(...rows), rows.length) },
    usage,
    enabled: opts.enabled ?? true,
    now: () => NOW,
  });
  return { uc, marks, saved, llm: () => llmCalls };
};

describe("ExtractArticleFacts", () => {
  it("검사를 지난 사실만 · 종류는 사전 · available_at = 본문 받은 시각", async () => {
    const h = harness({ bodies: [body("kr:1")] });
    const r = await h.uc.execute();
    assert.deepEqual([r.extracted, r.facts, r.failed], [1, 1, 0]);
    assert.equal(h.saved[0]?.eventKind, "earnings");
    assert.equal(h.saved[0]?.amount, "52");
    assert.equal(h.saved[0]?.availableAt.toISOString(), "2026-11-13T09:30:00.000Z");
    assert.deepEqual(h.marks, [["kr:1", "done"]]);
  });
  it("공시 원천(dart)이면 사실도 공시 · 종류는 공시 규칙으로", async () => {
    const h = harness({ bodies: [body("dart:1", { via: "dart" })] });
    await h.uc.execute();
    assert.deepEqual([h.saved[0]?.sourceKind, h.saved[0]?.eventKind], ["disclosure", "earnings:d"]);
  });
  it("원문에 없는 숫자는 버리고 본문은 끝낸 것으로", async () => {
    const h = harness({ bodies: [body("kr:1")], output: () => JSON.stringify([{ who: "씨티씨바이오", what: "영업이익", amount: 5200000000, unit: "원" }]) });
    const r = await h.uc.execute();
    assert.deepEqual([r.facts, r.dropped, r.extracted], [0, 1, 1]);
    assert.deepEqual(h.marks, [["kr:1", "done"]]);
  });
  it("LLM 실패 · 모양 틀림은 그 본문만 실패로 — 다음 본문은 간다", async () => {
    const h = harness({
      bodies: [body("kr:1"), body("kr:2", { paragraphs: ["둘째 본문 — 영업이익 52억원 · 182% 증가."] }), body("kr:3", { paragraphs: ["셋째 본문 52억원 182%"] })],
      output: (k) => (k === "kr:1" ? new Error("timeout") : k === "kr:2" ? "모르겠어요" : undefined as never),
    });
    const r = await h.uc.execute();
    assert.deepEqual([r.failed, r.extracted], [2, 1]);
    assert.deepEqual(h.marks, [["kr:1", "failed"], ["kr:2", "failed"], ["kr:3", "done"]]);
  });
  it("상한에 닿으면 멈추고 남은 것은 다음 회차(표시 안 함)", async () => {
    const h = harness({ bodies: [body("kr:1"), body("kr:2")], calls: 299 });
    const r = await h.uc.execute();
    assert.deepEqual([r.extracted, r.deferred], [1, 1]);
    assert.deepEqual(h.marks, [["kr:1", "done"]]);
  });
  it("꺼져 있으면 읽지도 부르지도 않는다", async () => {
    const h = harness({ bodies: [body("kr:1")], enabled: false });
    assert.equal((await h.uc.execute()).candidates, 0);
    assert.equal(h.llm(), 0);
  });
});
