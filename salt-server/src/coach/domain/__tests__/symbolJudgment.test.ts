import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isJudgmentSnapshotDue,
  judgeOutcome,
  judgmentCaveats,
  judgmentTriadSource,
  judgmentObservations,
  judgmentMaturesAt,
  judgmentReturnRate,
  judgmentSignalType,
  MIN_JUDGMENT_SAMPLE,
  summarizeJudgmentTrack,
  type JudgmentCase,
} from "../index";

/**
 * 종목 판단 사후 판정 · 게이트 (F004 · 감사 문서 D11 · B39).
 *
 * 기대값은 B39 표(2026-09-21 사용자 확정)를 그대로 옮긴 것이다.
 */

const T0 = new Date("2026-09-01T00:00:00Z");
const hoursAfter = (h: number) => new Date(T0.getTime() + h * 3600_000);

const miss: JudgmentCase = {
  symbol: "BTC",
  judgedAt: T0,
  action: "wait",
  returnRate: 0.12,
};

describe("judgeOutcome — B39", () => {
  it("후보(review_*)는 기간 수익률 > 0 이면 적중, 0 이면 실패", () => {
    // 왕복 비용 0.1% 를 넘겨야 적중이다 (F010 슬라이스 0)
    assert.equal(judgeOutcome("scalp", "review_short_opportunity", 0.0011), "hit");
    assert.equal(judgeOutcome("scalp", "review_short_opportunity", 0.001), "miss");
    assert.equal(judgeOutcome("scalp", "review_short_opportunity", 0), "miss");
    assert.equal(judgeOutcome("long_term", "review_accumulation", -0.05), "miss");
  });

  it("피하기(avoid)는 기간 수익률 ≤ 0 이면 적중", () => {
    assert.equal(judgeOutcome("long_term", "avoid", 0), "hit");
    assert.equal(judgeOutcome("long_term", "avoid", 0.001), "hit"); // 비용 안이면 안 오른 것
    assert.equal(judgeOutcome("long_term", "avoid", -0.2), "hit");
    assert.equal(judgeOutcome("scalp", "avoid", 0.01), "miss");
  });

  it("관망(wait)은 단타 ±2% · 장기 ±10% 안이면 적중 (경계 포함)", () => {
    assert.equal(judgeOutcome("scalp", "wait", 0.02), "hit");
    assert.equal(judgeOutcome("scalp", "wait", -0.0201), "miss");
    assert.equal(judgeOutcome("long_term", "wait", -0.1), "hit");
    assert.equal(judgeOutcome("long_term", "wait", 0.12), "miss");
  });
});

describe("관찰 기간 · 표본 독립성 — B39", () => {
  it("단타는 24시간, 장기는 30일 뒤에 만기다", () => {
    assert.deepEqual(judgmentMaturesAt("scalp", T0), hoursAfter(24));
    assert.deepEqual(judgmentMaturesAt("long_term", T0), hoursAfter(24 * 30));
  });

  it("같은 종목 · 모드는 관찰 기간 안에 다시 쓰지 않는다", () => {
    assert.equal(isJudgmentSnapshotDue("scalp", null, T0), true);
    assert.equal(isJudgmentSnapshotDue("scalp", T0, hoursAfter(23)), false);
    assert.equal(isJudgmentSnapshotDue("scalp", T0, hoursAfter(24)), true);
    assert.equal(isJudgmentSnapshotDue("long_term", T0, hoursAfter(24 * 29)), false);
  });

  it("수익률은 종가 비율이다", () => {
    assert.equal(judgmentReturnRate(100, 110).toFixed(4), "0.1000");
  });

  it("성적표 그룹 키는 <mode>.<action>", () => {
    assert.equal(judgmentSignalType("long_term", "wait"), "long_term.wait");
  });
});

describe("summarizeJudgmentTrack", () => {
  it("표본 0 이면 승률이 0% 가 아니라 null 이다 (FR-132)", () => {
    const record = summarizeJudgmentTrack("scalp", "scalp.wait", {
      sample: 0,
      hits: 0,
      aboveCost: 0,
      avgReturn: null,
      worstReturn: null,
    });
    assert.equal(record.sample, 0);
    assert.equal(record.winRate, null);
    assert.equal(record.lowSample, true);
    assert.equal(record.horizonHours, 24);
  });

  it(`표본 ${MIN_JUDGMENT_SAMPLE} 부터 lowSample 이 풀린다`, () => {
    const at = (sample: number) =>
      summarizeJudgmentTrack("long_term", "long_term.wait", {
        sample,
        hits: 1,
        aboveCost: 0,
        avgReturn: 0,
        worstReturn: -0.1,
      });
    assert.equal(at(MIN_JUDGMENT_SAMPLE - 1).lowSample, true);
    assert.equal(at(MIN_JUDGMENT_SAMPLE).lowSample, false);
    assert.equal(at(MIN_JUDGMENT_SAMPLE).winRate, 1 / MIN_JUDGMENT_SAMPLE);
  });
});

describe("성적 4요소 claim (F009 FR-33)", () => {
  const stats = {
    sample: 25,
    hits: 15,
    aboveCost: 12,
    poolSample: 25,
    poolAboveCost: 12,
    avgReturn: 0.01,
    worstReturn: -0.2,
    firstScoredAt: new Date("2026-09-24T03:00:00Z"),
    lastScoredAt: new Date("2026-10-06T03:00:00Z"),
  };

  it("후보 판단은 네 칸이 다 있다 — 빗나간 수는 사례 목록 길이가 아니라 표본 전체", () => {
    const { claim } = summarizeJudgmentTrack("long_term", "long_term.review_accumulation", stats);
    assert.deepEqual(claim, {
      period: { present: true, from: "2026-09-24", to: "2026-10-06" },
      sample: 25,
      baseline: { present: true, code: "same_action_always" },
      misses: { present: true, count: 10, outOf: 25 },
    });
  });

  it("관망은 기준 · 빗나간 수 대신 이유를 싣는다", () => {
    const { claim } = summarizeJudgmentTrack("scalp", "scalp.wait", stats);
    assert.deepEqual(claim.baseline, { present: false, reason: "no_direction" });
    assert.deepEqual(claim.misses, { present: true, count: 10, outOf: 25 });
  });

  it("표본 0 이면 네 칸 모두 no_sample", () => {
    const { claim } = summarizeJudgmentTrack("scalp", "scalp.avoid", {
      ...stats,
      sample: 0,
      hits: 0,
      firstScoredAt: null,
      lastScoredAt: null,
    });
    assert.deepEqual(claim.period, { present: false, reason: "no_sample" });
    assert.deepEqual(claim.baseline, { present: false, reason: "no_sample" });
    assert.deepEqual(claim.misses, { present: false, reason: "no_sample" });
  });
});

describe("judgmentTriadSource — 3종은 늘 다: 라이브 → 과거 검산 → 결함 (ADR-010 v2)", () => {
  const st = (sample: number, misses: number) => ({ sample, hits: sample - misses });
  const table: Array<[string, ReturnType<typeof st>, ReturnType<typeof st> | null, boolean, unknown]> = [
    ["라이브 20 · 빗나감 1 → 라이브", st(20, 1), st(500, 100), true, { origin: "live", caveat: null }],
    ["라이브 19 → 과거 검산으로 채움", st(19, 3), st(500, 100), true, { origin: "backtest", caveat: "live_sample_short" }],
    ["라이브 25 · 빗나감 0 → 과거 검산으로 채움", st(25, 0), st(500, 100), true, { origin: "backtest", caveat: "live_sample_short" }],
    ["라이브 0 · 과거 검산 없음 → 결함", st(0, 0), null, false, { origin: "live", caveat: "backtest_missing" }],
    ["과거 검산이 쓸 수 없음(판단 달 < 12) → 결함", st(3, 1), st(500, 100), false, { origin: "live", caveat: "backtest_missing" }],
    ["과거 검산도 19 → 결함", st(3, 1), st(19, 5), true, { origin: "live", caveat: "backtest_missing" }],
    ["과거 검산 빗나감 0 → 결함", st(3, 1), st(40, 0), true, { origin: "live", caveat: "backtest_missing" }],
  ];
  for (const [name, live, backtest, usable, expected] of table) {
    it(name, () => assert.deepEqual(judgmentTriadSource(live, backtest, usable), expected));
  }
});

describe("judgmentCaveats — 판단은 늘 나가고 꼬리표가 붙는다 (ADR-010 v2)", () => {
  const seen = judgmentObservations(
    "scalp",
    [
      { item: "change24h", points: 0, value: 1.2 },
      { item: "sentiment", points: 0, value: 50 },
      { item: "rsi", points: 0, value: 48 },
      { item: "whale_flow", points: 0, value: null },
      { item: "missing_data", points: 0, value: 0 },
    ],
    []
  );
  const unseen = judgmentObservations(
    "scalp",
    [
      { item: "change24h", points: 0, value: 0 },
      { item: "sentiment", points: 0, value: null },
      { item: "rsi", points: 0, value: null },
    ],
    ["price", "sentiment", "technical_indicator"]
  );
  const live = { origin: "live" as const, caveat: null };
  const filled = { origin: "backtest" as const, caveat: "live_sample_short" as const };
  const missing = { origin: "live" as const, caveat: "backtest_missing" as const };
  const wait = { action: "wait" as const, reasons: [] as string[], risks: ["r"] };
  const full = { ...wait, observations: seen, triad: live };

  // 경계 표 — 입력 하나씩 바꿔 꼬리표가 정확히 그것만 붙는지
  const table: Array<[string, Parameters<typeof judgmentCaveats>[0], string[]]> = [
    ["관망 · 문장 0 · 관측 있음 · 라이브 완전 → 꼬리표 0 (예전 reasons_missing)", full, []],
    ["관측이 전부 결측이고 문장도 0 → inputs_missing(결함)", { ...full, observations: unseen }, ["inputs_missing"]],
    ["관측이 결측이어도 문장이 있으면 근거가 있다", { ...full, observations: unseen, reasons: ["x"] }, []],
    ["피하기는 risks 도 근거(2026-09-21)", { ...full, action: "avoid", observations: unseen }, []],
    ["과거 검산으로 채움 → live_sample_short", { ...full, triad: filled }, ["live_sample_short"]],
    ["과거 검산도 없음 → backtest_missing(결함)", { ...full, triad: missing }, ["backtest_missing"]],
    ["성적 조회 실패 → track_record_unavailable(결함)", { ...full, triad: null }, ["track_record_unavailable"]],
    ["투자유의", { ...full, exchangeWarning: true }, ["exchange_warning"]],
    ["오래된 재료", { ...full, staleInputs: ["technical_indicator"] }, ["stale_inputs"]],
    [
      "전부 겹치면 전부 · 순서는 재료 → 성적 → 결함",
      { ...full, historyShort: true, exchangeWarning: true, staleInputs: ["price"], observations: unseen, triad: null },
      ["insufficient_history", "exchange_warning", "stale_inputs", "inputs_missing", "track_record_unavailable"],
    ],
  ];
  for (const [name, input, expected] of table) {
    it(name, () => assert.deepEqual(judgmentCaveats(input), expected));
  }
});

describe("기저율 · 초과 적중률 (F010 슬라이스 0)", () => {
  it("후보는 '항상 오른다' 대비, 피하기는 '항상 안 오른다' 대비, 관망은 없다", () => {
    const stats = { sample: 20, hits: 14, aboveCost: 12, poolSample: 20, poolAboveCost: 12, avgReturn: 0.02, worstReturn: -0.1 };
    const review = summarizeJudgmentTrack("scalp", "scalp.review_short_opportunity", stats);
    assert.equal(review.alwaysUpRate, 0.6);
    assert.ok(Math.abs(review.excessWinRate! - 0.1) < 1e-9); // 0.7 − 0.6
    const avoid = summarizeJudgmentTrack("scalp", "scalp.avoid", stats);
    assert.ok(Math.abs(avoid.excessWinRate! - 0.3) < 1e-9); // 0.7 − (1 − 0.6)
    assert.equal(summarizeJudgmentTrack("scalp", "scalp.wait", stats).excessWinRate, null);
  });
  it("표본 0 이면 둘 다 null 이다", () => {
    const r = summarizeJudgmentTrack("scalp", "scalp.avoid", { sample: 0, hits: 0, aboveCost: 0, poolSample: 30, poolAboveCost: 12, avgReturn: null, worstReturn: null });
    assert.equal(r.alwaysUpRate, null);
    assert.equal(r.excessWinRate, null);
  });
  it("기저율은 행동 무관 풀에서 — 그룹 표본으로 세면 후보 · 피하기 초과분이 늘 0 이다 (2026-10-26 정정)", () => {
    // 후보 20건: 적중 = 비용 넘겨 오름 = 14. 풀(같은 모드 판단 전체) 40건 중 오름 20
    const review = summarizeJudgmentTrack("long_term", "long_term.review_accumulation", {
      sample: 20, hits: 14, aboveCost: 14, poolSample: 40, poolAboveCost: 20, avgReturn: 0.02, worstReturn: -0.1,
    });
    assert.equal(review.alwaysUpRate, 0.5);
    assert.ok(Math.abs(review.excessWinRate! - 0.2) < 1e-9); // 0.7 − 0.5 (그룹 표본으로 셌다면 0.7 − 0.7 = 0)
    // 피하기 20건: 적중 = 비용 넘겨 안 오름 = 20 − 8
    const avoid = summarizeJudgmentTrack("long_term", "kr_stock.long_term.avoid", {
      sample: 20, hits: 12, aboveCost: 8, poolSample: 40, poolAboveCost: 20, avgReturn: -0.01, worstReturn: -0.2,
    });
    assert.ok(Math.abs(avoid.excessWinRate! - 0.1) < 1e-9); // 0.6 − (1 − 0.5)
  });
});
