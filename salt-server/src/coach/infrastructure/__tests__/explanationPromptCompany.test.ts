import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CoachExplanationInput } from "../../domain";
import { buildLineExplanationPrompt } from "../explanationPrompt";

/** F017 v4 2b+ FR-16 — 해설 프롬프트의 회사 사정 칸 */

const input: CoachExplanationInput = {
  symbol: "085660", koreanName: "차바이오텍", mode: "long_term", currentPrice: 10_000, change24h: 1, tradeValue24h: 1e10,
  evidence: [{ label: "근거", value: "RSI 45" }],
};
const withC: CoachExplanationInput = { ...input, company: { lines: [{ text: "차바이오텍 3분기 누적 연결 영업손실 831억원", source: "파이낸셜뉴스", concern: true }] } };

describe("해설 프롬프트 — 회사 사정", () => {
  it("회사 사정 칸 · [걸리는 점] · 주의 줄이 그것을 먼저", () => {
    const p = buildLineExplanationPrompt(withC);
    assert.match(p, /회사 사정 \(공시 · 기사에서 뽑은 사실/);
    assert.match(p, /\[걸리는 점\] 차바이오텍 3분기 누적 연결 영업손실 831억원 \(파이낸셜뉴스\)/);
    assert.match(p, /주의: \(1줄\) 이 판단이 약해지는 조건 — 회사 사정의 \[걸리는 점\]/);
    assert.doesNotMatch(buildLineExplanationPrompt(input), /회사 사정/);
  });
});
