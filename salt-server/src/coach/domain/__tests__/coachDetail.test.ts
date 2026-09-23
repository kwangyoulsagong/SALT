import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  coachSignalType,
  readStoredRecommendation,
  recommendationGate,
  staleHours,
  summarizeRecommendationTrack,
  toExitPlan,
} from "../policy";

/**
 * 코치 상세 규칙 (`SRV-REQ-025` FR-1~9 · 18 · `SRV-REQ-024` FR-11~15 · 32).
 */

const T0 = new Date("2026-09-01T00:00:00Z");

const track = (sampleCount: number) =>
  summarizeRecommendationTrack("coach.buy", {
    sampleCount,
    winRate: sampleCount ? 0.5 : null,
    avgReturn: sampleCount ? 0.01 : null,
    maxDrawdown: sampleCount ? -0.1 : null,
  });

const reason = { type: "rsi", message: "RSI 과매도" };
const factor = { key: "rsi", score: 10, message: "RSI 과매도" };
const failure = { date: "2026-08-01", event: "coach.buy", outcome: "miss" };

describe("recommendationGate", () => {
  it("근거는 reasons 와 topFactors 둘 다 있어야 한다", () => {
    const base = { trackRecord: track(5), failureCases: [failure] };

    assert.equal(
      recommendationGate({ ...base, reasons: [], topFactors: [factor] }).blockedReason,
      "reasons_missing"
    );
    assert.equal(
      recommendationGate({ ...base, reasons: [reason], topFactors: [] }).blockedReason,
      "reasons_missing"
    );
  });

  it("성적이 없거나 표본 0 이면 signal_track_record_missing 이다", () => {
    const base = { reasons: [reason], topFactors: [factor], failureCases: [failure] };

    assert.equal(
      recommendationGate({ ...base, trackRecord: null }).blockedReason,
      "signal_track_record_missing"
    );
    assert.equal(
      recommendationGate({ ...base, trackRecord: track(0) }).blockedReason,
      "signal_track_record_missing"
    );
  });

  it("표본 1건 이상이면 통과하고 lowSample 로 표시한다 (FR-32 기본안)", () => {
    const gate = recommendationGate({
      reasons: [reason],
      topFactors: [factor],
      trackRecord: track(3),
      failureCases: [failure],
    });

    assert.deepEqual(gate, { renderable: true, blockedReason: null });
    assert.equal(track(3).lowSample, true);
    assert.equal(track(20).lowSample, false);
  });

  it("실패사례가 비면 failure_cases_missing 이다 — 막혀도 값이다", () => {
    const gate = recommendationGate({
      reasons: [reason],
      topFactors: [factor],
      trackRecord: track(30),
      failureCases: [],
    });

    assert.deepEqual(gate, {
      renderable: false,
      blockedReason: "failure_cases_missing",
    });
  });
});

describe("summarizeRecommendationTrack", () => {
  it("표본 0 은 null 이 아니라 sample: 0 · winRate: null 이다", () => {
    const record = track(0);

    assert.equal(record.sample, 0);
    assert.equal(record.winRate, null);
    assert.equal(record.signalType, "coach.buy");
  });

  it("신호 유형은 coach.<action> 이다 — 종목 판단 키와 섞이지 않는다", () => {
    assert.equal(coachSignalType("rebalance"), "coach.rebalance");
  });
});

describe("staleHours", () => {
  it("내림한 정수 시간이다", () => {
    const now = new Date(T0.getTime() + 27.9 * 3_600_000);
    assert.equal(staleHours(T0, now), 27);
  });

  it("미래 시각이면 0 이다", () => {
    assert.equal(staleHours(new Date(T0.getTime() + 3_600_000), T0), 0);
  });
});

describe("readStoredRecommendation", () => {
  const payload = {
    recommendation: { action: "buy", symbol: "BTC", score: 72 },
    candidates: [
      { action: "buy", symbol: "BTC", score: 72 },
      { action: "hold", symbol: "ETH", score: 60 },
      { action: "sell", symbol: "XRP", score: 55 },
      { action: "hold", symbol: "SOL", score: 40 },
    ],
    market: { regime: "bullish" },
    reasons: [reason, { type: 1 }],
    risks: [{ type: "concentration", message: "집중" }],
    debug: { topCandidateFactors: [factor] },
    generatedAt: "2026-09-02T00:00:00.000Z",
  };

  it("본체와 목록을 읽고 후보는 상위 3 만 남긴다", () => {
    const stored = readStoredRecommendation(payload, T0)!;

    assert.equal(stored.action, "buy");
    assert.equal(stored.regime, "bullish");
    assert.equal(stored.candidates.length, 3);
    assert.equal(stored.reasons.length, 1, "모양이 틀린 근거는 빠진다");
    assert.equal(stored.risks[0].severity, 0);
    assert.equal(stored.topFactors.length, 1);
  });

  it("generatedAt 은 payload 값이 먼저다 — 덮어쓰기 행의 createdAt 은 첫 생성 시각이다", () => {
    assert.equal(
      readStoredRecommendation(payload, T0)!.generatedAt.toISOString(),
      "2026-09-02T00:00:00.000Z"
    );
    assert.equal(
      readStoredRecommendation({ ...payload, generatedAt: "nope" }, T0)!.generatedAt,
      T0
    );
  });

  it("본체가 어긋나면 추천이 없는 것이다", () => {
    assert.equal(readStoredRecommendation(null, T0), null);
    assert.equal(
      readStoredRecommendation(
        { recommendation: { action: "moon", symbol: "BTC", score: 1 } },
        T0
      ),
      null
    );
    assert.equal(
      readStoredRecommendation({ kind: "coach_feedback" }, T0),
      null
    );
  });
});

describe("toExitPlan", () => {
  it("익절 계획과 같은 가격 · 거리를 주고 추세 유지는 코드다", () => {
    const plan = toExitPlan(
      {
        symbol: "BTC",
        totalQuantity: 1,
        averageBuyPrice: 1000,
        totalInvested: 1000,
        currentPrice: 1200,
        currentValue: 1200,
        unrealizedProfit: 200,
        unrealizedProfitRate: 5,
        realizedProfit: 0,
      },
      "crypto"
    );

    assert.deepEqual(plan.stopLoss, { price: 920, priceGap: -280 });
    assert.deepEqual(plan.firstTakeProfit, { price: 1120, priceGap: -80 });
    assert.equal(plan.trendHold.conditionCode, "hold_or_trail_stop");
    assert.equal(plan.assetType, "crypto");
  });
});
