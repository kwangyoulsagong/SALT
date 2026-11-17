import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type EarningsWindowRow, type ReactionStatsRow, toEarningsOutlook } from "../policy";

/** F008 슬라이스 24 2단계 — 다음 실적 공시: 확정 일정 > 예상 창(한 날짜 아님 · 3종) > 막힘 사유. 경계 표 */

const NOW = new Date("2026-10-20T03:00:00Z"); // KST 10-20
const base: EarningsWindowRow = {
  asOf: new Date("2026-10-20T00:00:00Z"),
  periodEnd: "2026-09-30",
  annual: false,
  lagMin: 25,
  lagMedian: 29,
  lagMax: 35,
  sample: 30,
  windowFrom: "2026-10-25",
  windowTo: "2026-11-04",
  deadline: "2026-11-14",
  hits: 22,
  judged: 25,
  misses: [{ periodEnd: "2025-03-31", actual: "2025-05-12", from: "2025-04-25", to: "2025-05-05" }],
  confirmedAt: null,
  confirmedTimeKnown: null,
  confirmedSource: null,
  renderable: true,
  blockedReason: null,
};
const reaction = (h: number): ReactionStatsRow => ({
  horizonDays: h, asOf: base.asOf, sample: 20, q05: -0.05, q25: -0.01, q50: 0.004, q75: 0.02, q95: 0.06, upRate: 0.55,
  baselineQ05: -0.03, baselineQ50: 0, baselineQ95: 0.03, moveRatio: 1.6, preReturn5dMedian: 0.01,
  recentMisses: [{ eventAt: "2025-04-30T15:00:00Z", realized: -0.09, low: -0.05, high: 0.06 }], recentEvents: [],
  renderable: true, blockedReason: null, windowFrom: null, windowTo: null, missCount: 2, missJudged: 10,
});

describe("toEarningsOutlook", () => {
  it("창 행이 없으면 null(코인 · 자료 없음)", () => assert.equal(toEarningsOutlook(null, [], NOW), null));

  it("예상 창 — 기간 · 표본 · 적중 · 빗나간 결산 · 기준(법정 기한), 한 날짜 없음 · 반응 세 기간", () => {
    const v = toEarningsOutlook(base, [1, 5, 20].map(reaction), NOW)!;
    assert.equal(v.confirmed, null);
    assert.deepEqual(v.expected, { from: "2026-10-25", to: "2026-11-04", sample: 30, hits: 22, judged: 25, misses: base.misses, deadline: "2026-11-14" });
    assert.equal(v.blockedReason, null);
    assert.deepEqual(v.horizons.map((h) => [h.horizonDays, h.renderable]), [[1, true], [5, true], [20, true]]);
  });

  it("확정 일정이 아직 안 지났으면 그것만 — 창은 싣지 않는다", () => {
    const v = toEarningsOutlook({ ...base, confirmedAt: new Date("2026-10-29T01:00:00Z"), confirmedTimeKnown: true, confirmedSource: "ir" }, [], NOW)!;
    assert.deepEqual(v.confirmed, { at: "2026-10-29T01:00:00.000Z", timeKnown: true, source: "ir" });
    assert.equal(v.expected, null);
    assert.equal(v.blockedReason, null);
  });

  it("확정 일정이 지났으면 버린다 — 다음 배치 전 낡은 행", () => {
    const v = toEarningsOutlook({ ...base, confirmedAt: new Date("2026-10-19T01:00:00Z"), confirmedSource: "ir" }, [], NOW)!;
    assert.equal(v.confirmed, null);
    assert.ok(v.expected);
  });

  const blocked: Array<[string, Partial<EarningsWindowRow>, string]> = [
    ["예측이 막음(표본)", { renderable: false, blockedReason: "insufficient_sample" }, "insufficient_sample"],
    ["예측이 막음(창 지남)", { renderable: false, blockedReason: "window_passed" }, "window_passed"],
    ["창 끝이 오늘 전(낡은 행)", { windowTo: "2026-10-19" }, "window_past"],
    ["창 끝이 오늘이면 아직 보인다", { windowTo: "2026-10-20" }, "none"],
    ["판정 0", { judged: 0, hits: 0 }, "not_judged"],
  ];
  for (const [name, over, want] of blocked) {
    it(`막힘 경계 — ${name}`, () => {
      const v = toEarningsOutlook({ ...base, ...over }, [], NOW)!;
      if (want === "none") return assert.ok(v.expected);
      assert.equal(v.expected, null);
      assert.equal(v.blockedReason, want);
    });
  }

  it("반응 기간이 없으면 막힌 기간으로 채운다", () => {
    const v = toEarningsOutlook(base, [reaction(5)], NOW)!;
    assert.deepEqual(v.horizons.map((h) => (h.renderable ? "ok" : h.blockedReason)), ["not_generated", "ok", "not_generated"]);
  });
});
