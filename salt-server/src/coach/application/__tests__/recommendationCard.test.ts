import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CoachInsight, JudgmentTrackStats, RecommendationCase } from "../../domain";
import { ReadConversationCard } from "../lib/recommendationCard";

/**
 * 대화 카드(F006 2단계 · `SRV-REQ-028` FR-50~54 · `DB-REQ-022` FR-11 · 12) — 코치 상세와 같은 게이트를 지나고,
 * 막힌 카드에는 추천 내용(행동 · 종목 · 점수 · 근거)이 실리지 않는다.
 */

const NOW = new Date("2026-11-18T09:00:00Z");

const insight = (over: Record<string, unknown> = {}): CoachInsight =>
  ({
    id: "insight-1",
    summary: "보유 유지 쪽",
    createdAt: new Date("2026-11-18T05:00:00Z"),
    payload: {
      generatedAt: "2026-11-18T05:00:00.000Z",
      recommendation: { action: "hold", symbol: "BTC", score: 55 },
      reasons: [{ type: "trend", message: "추세 유지" }],
      debug: { topCandidateFactors: [{ key: "trend", score: 12, message: "추세" }] },
      ...over,
    },
  }) as unknown as CoachInsight;

const stats = (sample: number): JudgmentTrackStats => ({
  sample,
  hits: Math.floor(sample * 0.6),
  aboveCost: 0,
  poolSample: sample,
  poolAboveCost: 0,
  avgReturn: 0.01,
  worstReturn: -0.1,
  firstScoredAt: null,
  lastScoredAt: null,
});

const miss: RecommendationCase = {
  symbol: "ETH",
  action: "hold",
  judgedAt: new Date("2026-10-01T00:00:00Z"),
  entryPrice: 1,
  exitPrice: 0.9,
  returnRate: -0.1,
  outcome: "miss",
};

const reader = (latest: CoachInsight | null, sample: number, misses: RecommendationCase[]) =>
  new ReadConversationCard(
    { findLatestRecommendation: async () => latest },
    {
      market: { quotes: async () => new Map() },
      recommendations: { summarize: async () => stats(sample), recentCases: async () => misses },
    } as never,
    () => NOW
  );

const CONTENT_KEYS = ["action", "symbol", "score", "reasons", "topFactors", "explanation", "assetType"];

describe("ReadConversationCard", () => {
  it("3종이 다 있으면 통과 카드 — 판단 시각 · 추천 행 id · 나이", async () => {
    const card = await reader(insight(), 24, [miss]).execute("u1");
    assert.ok(card);
    assert.equal(card.insightId, "insight-1");
    assert.equal(card.payload.renderable, true);
    assert.equal(card.payload.generatedAt, "2026-11-18T05:00:00.000Z");
    assert.deepEqual(card.summary, { renderable: true, symbol: "BTC", staleHours: 4 });
  });

  for (const [name, sample, misses, reason] of [
    ["성적 0", 0, [miss], "signal_track_record_missing"],
    ["표본 적음", 5, [miss], "insufficient_sample"],
    ["빗나간 사례 없음", 24, [], "failure_cases_missing"],
  ] as const) {
    it(`막힌 카드(${name}) — 게이트 칸만, 추천 내용 0`, async () => {
      const card = await reader(insight(), sample, [...misses]).execute("u1");
      assert.ok(card);
      assert.equal(card.payload.renderable, false);
      if (!card.payload.renderable) assert.equal(card.payload.blockedReason, reason);
      for (const key of CONTENT_KEYS) assert.equal(key in card.payload, false, key);
      assert.deepEqual(card.payload.failureCases, []);
      assert.equal(card.summary.symbol, null);
    });
  }

  it("근거가 없으면 막힌다(reasons_missing)", async () => {
    const card = await reader(insight({ reasons: [] }), 24, [miss]).execute("u1");
    assert.equal(card?.payload.renderable, false);
  });

  it("저장 추천이 없거나 읽을 수 없으면 null", async () => {
    assert.equal(await reader(null, 24, [miss]).execute("u1"), null);
    assert.equal(await reader(insight({ recommendation: { action: "moon" } }), 24, [miss]).execute("u1"), null);
  });
});
