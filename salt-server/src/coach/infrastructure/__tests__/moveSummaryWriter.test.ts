import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LlmCallRecord, LlmUsageStore, MoveSummaryPrompt } from "../../domain";
import { moveSummaryPromptFacts } from "../../domain";
import { LlmMoveSummaryWriter, MoveSummaryGeminiBlocked } from "../LlmMoveSummaryWriter";
import type { CliRun } from "../localCliProcess";
import { buildMoveSummaryPrompt, cleanMoveSummaryOutput } from "../moveSummaryPrompt";

/** 오늘 등락 한 줄 LLM — 로컬 CLI 격리 · 사용량 원장 · Gemini 상한(F016 단계 D · `SRV-REQ-052` FR-3 · 6 · 8) */

const PROMPT: MoveSummaryPrompt = {
  asset: "kr",
  name: "가나다",
  direction: "up",
  dominant: "idio",
  facts: moveSummaryPromptFacts([
    { id: "kr-news:1", kind: "disclosure", at: new Date("2026-11-12T09:10:00+09:00"), source: "한국거래소", title: "단일판매ㆍ공급계약체결", value: null },
  ]),
};

const usage = () => {
  const rows: LlmCallRecord[] = [];
  const store: LlmUsageStore = {
    record: async (r) => void rows.push(r),
    markDropped: async () => undefined,
    usageSince: async () => ({ totalCalls: 0, totalTokens: 0 }) as never,
  };
  return { rows, store };
};

describe("buildMoveSummaryPrompt", () => {
  it("번호 · 시각 · 종류 · 출처 · 글 — 분해 숫자 0", () => {
    const text = buildMoveSummaryPrompt(PROMPT);
    assert.match(text, /\[1\] 09:10 · 공시 · 한국거래소 · 단일판매ㆍ공급계약체결/);
    assert.match(text, /이 종목만의 움직임이 가장 컸어요/);
    assert.doesNotMatch(text, /%/);
  });
  it("머리말 · 따옴표를 걷는다", () => {
    assert.equal(cleanMoveSummaryOutput('문장: "공시가 있었어요[1]."\n'), "공시가 있었어요[1].");
  });
});

describe("LlmMoveSummaryWriter", () => {
  it("로컬 Claude — 격리 인자 · stdin 프롬프트 · 끝에 한 번(text) · 사용량 move_summary", async () => {
    const u = usage();
    const runs: CliRun[] = [];
    const w = new LlmMoveSummaryWriter(u.store, {
      run: async (r) => {
        runs.push(r);
        return { ok: true, stdout: "같은 날 공급계약 공시가 있었어요[1].\n", stderr: "" };
      },
    });
    w.useLocal({ provider: "local_claude", bin: "/bin/claude" });
    const out = await w.write(PROMPT, { geminiAllowed: true });
    assert.equal(out.text, "같은 날 공급계약 공시가 있었어요[1].");
    assert.equal(out.provider, "local_claude");
    const args = runs[0]!.args;
    assert.deepEqual(args.slice(0, 3), ["-p", "--output-format", "text"]);
    assert.ok(args.includes("--strict-mcp-config"));
    assert.equal(args[args.indexOf("--tools") + 1], "");
    assert.match(runs[0]!.stdin, /단일판매/);
    assert.equal(args.some((a) => a.includes("단일판매")), false, "프롬프트는 argv 가 아니라 stdin");
    assert.equal(u.rows[0]!.purpose, "move_summary");
    assert.equal(u.rows[0]!.ok, true);
  });

  it("로컬 실패 · Gemini 상한이면 막힘 — 실패 시도도 원장에", async () => {
    const u = usage();
    const w = new LlmMoveSummaryWriter(u.store, { run: async () => ({ ok: false, reason: "timeout", stderr: "" }) });
    w.useLocal({ provider: "local_claude", bin: "/bin/claude" });
    await assert.rejects(() => w.write(PROMPT, { geminiAllowed: false }), MoveSummaryGeminiBlocked);
    assert.equal(u.rows[0]!.ok, false);
    assert.equal(u.rows[0]!.errorCode, "timeout");
  });
});
