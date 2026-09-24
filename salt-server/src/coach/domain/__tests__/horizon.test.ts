import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COACH_HORIZON,
  JUDGMENT_HORIZON_MS,
  makeModeDecision,
  templateExplanation,
  verifyExplanation,
  type CoachExplanationInput,
} from "../index";

const HOUR_MS = 3600_000;

const input = (mode: "scalp" | "long_term"): CoachExplanationInput => ({
  mode,
  symbol: "BTC",
  koreanName: "비트코인",
  currentPrice: 100_000_000,
  change24h: 1.5,
  tradeValue24h: 5e11,
  evidence: [],
  news: [],
});

/** C05 — 판단 문구 · 해설 · 채점이 같은 기간을 말한다 */
describe("COACH_HORIZON", () => {
  it("채점 기간은 표의 값이다 — 단타 24시간 · 장기 30일", () => {
    assert.equal(JUDGMENT_HORIZON_MS.scalp, 24 * HOUR_MS);
    assert.equal(JUDGMENT_HORIZON_MS.long_term, 30 * 24 * HOUR_MS);
  });

  it("해설 문장의 숫자가 채점 기간과 같다", () => {
    assert.equal(templateExplanation(input("scalp"), new Date()).timeframe, "판단 뒤 24시간");
    assert.equal(templateExplanation(input("long_term"), new Date()).timeframe, "판단 뒤 30일");
    assert.equal(COACH_HORIZON.scalp.ms / HOUR_MS, 24);
    assert.equal(COACH_HORIZON.long_term.ms / (24 * HOUR_MS), 30);
  });

  it("판단 응답의 timeframe 도 같은 표를 읽는다", () => {
    const base = { symbol: "BTC", change24h: 0, whaleBuy: 0, whaleSell: 0, hasHolding: false, missingData: [] };
    assert.equal(makeModeDecision({ ...base, mode: "scalp" }).timeframe, "24h");
    assert.equal(makeModeDecision({ ...base, mode: "long_term" }).timeframe, "30d");
  });

  it("LLM 이 다른 기간을 써도 채점 기간으로 덮는다(FR-103)", () => {
    const now = new Date();
    const llm = { ...templateExplanation(input("scalp"), now), timeframe: "약 25분 이내" };
    assert.equal(verifyExplanation(llm, input("scalp"), now).explanation.timeframe, "판단 뒤 24시간");
  });
});
