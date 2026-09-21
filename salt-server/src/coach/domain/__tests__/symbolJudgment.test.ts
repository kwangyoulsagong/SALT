import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isJudgmentSnapshotDue,
  judgeOutcome,
  judgmentGate,
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
    assert.equal(judgeOutcome("scalp", "review_short_opportunity", 0.001), "hit");
    assert.equal(judgeOutcome("scalp", "review_short_opportunity", 0), "miss");
    assert.equal(judgeOutcome("long_term", "review_accumulation", -0.05), "miss");
  });

  it("피하기(avoid)는 기간 수익률 ≤ 0 이면 적중", () => {
    assert.equal(judgeOutcome("long_term", "avoid", 0), "hit");
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
        avgReturn: 0,
        worstReturn: -0.1,
      });
    assert.equal(at(MIN_JUDGMENT_SAMPLE - 1).lowSample, true);
    assert.equal(at(MIN_JUDGMENT_SAMPLE).lowSample, false);
    assert.equal(at(MIN_JUDGMENT_SAMPLE).winRate, 1 / MIN_JUDGMENT_SAMPLE);
  });
});

describe("judgmentGate — 3종 게이트 (FR-137)", () => {
  const record = (sample: number) =>
    summarizeJudgmentTrack("scalp", "scalp.wait", {
      sample,
      hits: sample,
      avgReturn: 0,
      worstReturn: 0,
    });

  const wait = { action: "wait" as const, risks: ["r"] };

  it("근거가 없으면 막는다 — 피하기가 아니면 risks 는 근거가 아니다", () => {
    assert.deepEqual(
      judgmentGate({ ...wait, reasons: [], trackRecord: record(30), failureCases: [miss] }),
      { renderable: false, blockedReason: "reasons_missing" }
    );
  });

  it("표본이 20 미만이면 insufficient_sample — 초기 상태가 이것이다", () => {
    assert.deepEqual(
      judgmentGate({ ...wait, reasons: ["x"], trackRecord: record(19), failureCases: [miss] }),
      { renderable: false, blockedReason: "insufficient_sample" }
    );
  });

  it("표본이 충분해도 실패가 0건이면 막는다", () => {
    assert.deepEqual(
      judgmentGate({ ...wait, reasons: ["x"], trackRecord: record(25), failureCases: [] }),
      { renderable: false, blockedReason: "failure_cases_missing" }
    );
  });

  it("피하기는 risks 도 근거로 센다 (2026-09-21 사용자 확정)", () => {
    const avoid = { action: "avoid" as const, reasons: [], trackRecord: record(25), failureCases: [miss] };
    assert.deepEqual(judgmentGate({ ...avoid, risks: ["과열"] }), {
      renderable: true,
      blockedReason: null,
    });
    assert.deepEqual(judgmentGate({ ...avoid, risks: [] }), {
      renderable: false,
      blockedReason: "reasons_missing",
    });
  });

  it("셋이 다 있으면 렌더한다", () => {
    assert.deepEqual(
      judgmentGate({ ...wait, reasons: ["x"], trackRecord: record(25), failureCases: [miss] }),
      { renderable: true, blockedReason: null }
    );
  });
});
