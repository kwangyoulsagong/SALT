import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toPerformanceClaim } from "../performance-claim.viewmodel";

/** 성적 문구 4요소 (F009 FR-33 · `BFF-REQ-042`). 모양 검사만 — 깨진 칸은 지어내지 않고 not_recorded */

const full = {
  period: { present: true, from: "2026-09-24", to: "2026-10-06" },
  sample: 25,
  baseline: { present: true, code: "same_action_always" },
  misses: { present: true, count: 10, outOf: 25 },
};

describe("toPerformanceClaim", () => {
  it("온전한 claim 은 그대로 옮긴다", () => {
    assert.deepEqual(toPerformanceClaim(full), full);
  });

  it("빈 칸의 이유를 옮긴다 — 모르는 이유는 not_recorded", () => {
    const claim = toPerformanceClaim({
      ...full,
      baseline: { present: false, reason: "no_direction" },
      misses: { present: false, reason: "made_up" },
    });
    assert.deepEqual(claim?.baseline, { present: false, reason: "no_direction" });
    assert.deepEqual(claim?.misses, { present: false, reason: "not_recorded" });
  });

  it("깨진 칸은 비운다 — 날짜 모양 · 모르는 기준 · 분모보다 큰 빗나간 수", () => {
    const claim = toPerformanceClaim({
      sample: 25,
      period: { present: true, from: "어제", to: "2026-10-06" },
      baseline: { present: true, code: "beat_the_market" },
      misses: { present: true, count: 30, outOf: 25 },
    });
    assert.deepEqual(claim, {
      sample: 25,
      period: { present: false, reason: "not_recorded" },
      baseline: { present: false, reason: "not_recorded" },
      misses: { present: false, reason: "not_recorded" },
    });
  });

  it("claim 이 없거나 표본이 깨졌으면 null — 서버가 옛 버전", () => {
    assert.equal(toPerformanceClaim(undefined), null);
    assert.equal(toPerformanceClaim({ ...full, sample: -1 }), null);
    assert.equal(toPerformanceClaim({ ...full, sample: 2.5 }), null);
  });
});
