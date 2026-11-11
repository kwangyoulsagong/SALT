import { describe, expect, it } from "vitest";

import { judgmentEvidenceCount, nearestObservations, type JudgmentObservation } from "./symbolCoach";

/** 관측 한 줄 · 근거 수(`FE-REQ-064` FR-1) — 서버 순서 그대로 앞의 둘, 결측은 근거가 아니다 */
const row = (item: JudgmentObservation["item"], value: number | null, missing = false): JudgmentObservation => ({
  item,
  value,
  lower: 30,
  upper: 70,
  distance: value === null ? null : 1,
  points: 0,
  missing,
});

describe("nearestObservations", () => {
  it("결측을 빼고 서버 순서대로 둘", () => {
    const got = nearestObservations([row("sentiment", null, true), row("rsi", 49.3), row("change24h", -1.4), row("sentiment", 55)]);
    expect(got.map((r) => r.item)).toEqual(["rsi", "change24h"]);
    expect(nearestObservations([])).toEqual([]);
  });
});

describe("judgmentEvidenceCount", () => {
  it("관망 — 문장 0 이어도 본 값이 있으면 그만큼", () => {
    expect(judgmentEvidenceCount({ action: "wait", reasons: [], risks: [] }, [row("rsi", 49.3), row("change24h", null, true)])).toBe(1);
  });
  it("피하기는 위험 신호도 근거", () => {
    expect(judgmentEvidenceCount({ action: "avoid", reasons: ["a"], risks: ["b", "c"] }, [])).toBe(3);
    expect(judgmentEvidenceCount({ action: "wait", reasons: ["a"], risks: ["b"] }, [])).toBe(1);
  });
});
