import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
  ExplanationSentence,
  ExplanationSnapshotRecord,
  ExplanationSnapshotStore,
} from "../../domain";
import { fixedCauseLine } from "../../domain";
import { generateExplanation } from "../lib/explanationGeneration";
import type { PreparedExplanation } from "../lib/explanationMaterials";

/**
 * 원인 단계 '없음'의 원인 줄은 서버 문장 — 스트림과 저장본이 같은 순서로 같은 문장을 낸다(`SRV-REQ-060` FR-6).
 * 불변식: 판단 줄 다음 · 모델의 근거 줄보다 먼저 한 번 · 모델이 원인을 다시 말한 줄은 흘리지도 저장하지도 않는다
 */

const T0 = new Date("2026-11-18T04:00:00Z");
const quiet: CoachExplanationInput = {
  symbol: "005930",
  koreanName: "삼성전자",
  mode: "scalp",
  currentPrice: 192_700,
  change24h: 1.26,
  tradeValue24h: 2.2e12,
  evidence: [
    { label: "판단", value: "삼성전자 단타 관점은 관망입니다." },
    { label: "RSI", value: "43.2" },
  ],
  cause: { strength: "none", headline: "평소 범위 안의 움직임이에요", note: "따로 볼 만한 원인을 찾지 않았어요", evidence: [], result: "오늘 +1.26%" },
};
const prepared = {
  symbol: "005930",
  mode: "scalp",
  fingerprint: "fp",
  view: { judgment: { action: "watch" } },
  input: quiet,
} as unknown as PreparedExplanation;

const memoryStore = () => {
  const rows: ExplanationSnapshotRecord[] = [];
  const store: ExplanationSnapshotStore = {
    find: async () => null,
    save: async (r) => (rows.push(r), true),
    prune: async () => 0,
  };
  return { store, rows };
};

const run = async (lines: Array<{ section: "modeReasoning" | "keyDrivers" | "risks" | "newsSummary"; text: string }>) => {
  const final: CoachExplanation = {
    modeReasoning: lines.filter((l) => l.section === "modeReasoning").map((l) => l.text).join(" "),
    timeframe: "",
    keyDrivers: lines.filter((l) => l.section === "keyDrivers").map((l) => l.text),
    risks: lines.filter((l) => l.section === "risks").map((l) => l.text),
    newsSummary: [],
    disclaimer: "",
    generatedAt: T0.toISOString(),
    cached: false,
    provider: "local_claude",
  };
  const explainer: CoachExplainer = {
    explain: async (_i, _s, _c, hooks) => {
      for (const l of lines) hooks?.onLine?.(l);
      return final;
    },
  };
  const { store, rows } = memoryStore();
  const streamed: ExplanationSentence[] = [];
  const saved = await generateExplanation({ explainer, store, now: () => T0 }, prepared, quiet, false, (s) => streamed.push(s));
  return { saved, streamed, stored: rows[0]?.sentences ?? [] };
};

describe("서버 원인 줄 — 스트림 · 저장본(SRV-REQ-060 FR-6)", () => {
  const fixed = fixedCauseLine(quiet)!;

  it("판단 다음 · 모델 근거보다 먼저 한 번 — 뒤집은 줄은 흘리지 않음 · 저장본과 같은 순서", async () => {
    const { saved, streamed, stored } = await run([
      { section: "modeReasoning", text: "삼성전자 단타 관점은 관망이에요." },
      { section: "keyDrivers", text: "오늘 움직임은 평소 범위 안이라 따로 확인된 소식이 없어요." },
      { section: "keyDrivers", text: "RSI는 43.2예요." },
      { section: "risks", text: "평소 범위를 벗어나면 이 판단은 약해질 수 있어요." },
    ]);
    assert.equal(saved, true);
    const texts = streamed.map((s) => s.text);
    assert.deepEqual(texts, ["삼성전자 단타 관점은 관망이에요.", fixed, "RSI는 43.2예요.", "평소 범위를 벗어나면 이 판단은 약해질 수 있어요."]);
    assert.deepEqual(stored.map((s) => s.text), texts);
  });

  it("판단 줄만 통과해도 원인 줄은 끝에서 한 번", async () => {
    const { streamed, stored } = await run([
      { section: "modeReasoning", text: "삼성전자 단타 관점은 관망이에요." },
      { section: "keyDrivers", text: "확인된 소식이 없어요." },
    ]);
    assert.deepEqual(streamed.map((s) => s.text), ["삼성전자 단타 관점은 관망이에요.", fixed]);
    assert.equal(stored.filter((s) => s.text === fixed).length, 1);
  });
});
