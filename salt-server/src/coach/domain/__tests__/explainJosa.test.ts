import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CoachContext, ScoredCandidate } from "../model";
import { explainRecommendation } from "../policy/explain";

// FEATURE-008 FR-48 · SRV-REQ-037 FR-14 — 티커 뒤 조사는 읽는 소리로(2026-11-02 전엔 늘 "는": "SOL는")
const ctx = {
  marketRegime: "neutral",
  portfolioState: {},
  behaviorInsights: [],
} as unknown as CoachContext;

const top = (symbol: string, action: ScoredCandidate["action"]): ScoredCandidate => ({
  symbol,
  action,
  score: 70,
  positiveFactors: [],
  negativeFactors: [],
});

describe("explainRecommendation — 행동 안내 조사", () => {
  for (const [symbol, action, expected] of [
    ["SOL", "buy", "SOL은 점수상 매수 검토 구간입니다"],
    ["BTC", "buy", "BTC는 점수상 매수 검토 구간입니다"],
    ["ATOM", "sell", "ATOM은 점수상 일부 차익 실현"],
    ["ETH", "sell", "ETH는 점수상 일부 차익 실현"],
  ] as const) {
    it(`${symbol} ${action}`, () => {
      const { payload } = explainRecommendation(ctx, top(symbol, action), []);
      assert.ok(payload.actions[0]?.startsWith(expected), payload.actions[0]);
    });
  }
});
