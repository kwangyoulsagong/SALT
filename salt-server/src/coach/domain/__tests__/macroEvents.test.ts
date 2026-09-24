import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toMacroEvents, type EventCardRow } from "../policy";

const row = (over: Partial<EventCardRow> = {}): EventCardRow => ({
  kind: "cpi",
  eventAt: new Date("2026-10-14T12:30:00Z"),
  announcedAt: new Date("2026-10-07T12:30:00Z"),
  source: "fred",
  horizonDays: 1,
  asOf: new Date("2026-09-24T00:00:00Z"),
  sample: 48,
  q05: -0.025,
  q25: -0.008,
  q50: 0.005,
  q75: 0.015,
  q95: 0.045,
  upRate: 0.65,
  baselineQ05: -0.029,
  baselineQ50: 0.001,
  baselineQ95: 0.036,
  moveRatio: 1.25,
  preReturn5dMedian: 0.004,
  recentMisses: [{ eventAt: "2026-03-11T12:30:00Z", realized: -0.06, low: -0.03, high: 0.04 }],
  recentEvents: [{ eventAt: "2026-09-11T12:30:00Z", realized: 0.01, preReturn5d: 0.02 }],
  renderable: true,
  blockedReason: null,
  ...over,
});

describe("toMacroEvents (FC-REQ-005 · SRV-REQ-037 FR-10)", () => {
  it("일정 하나에 기간 3개 — 빠진 기간은 not_generated", () => {
    const [event] = toMacroEvents([row(), row({ horizonDays: 5 })]);
    assert.equal(event?.kind, "cpi");
    assert.deepEqual(
      event?.horizons.map((h) => (h.renderable ? h.horizonDays : `${h.horizonDays}:${h.blockedReason}`)),
      [1, 5, "20:not_generated"]
    );
    const h1 = event?.horizons[0];
    assert.ok(h1?.renderable);
    assert.deepEqual(h1.recent, [{ eventAt: "2026-09-11T12:30:00Z", realized: 0.01 }]);
  });

  it("빗나간 때가 없으면 분포를 싣지 않는다 — 3종이 다 있어야 한다", () => {
    const [event] = toMacroEvents([row({ recentMisses: [] })]);
    assert.deepEqual(event?.horizons[0], { horizonDays: 1, renderable: false, blockedReason: "failure_cases_missing" });
  });

  it("평소 분포가 비면 contract_incomplete, 표본이 모자라면 insufficient_sample — 서버도 한 번 더 막는다", () => {
    assert.equal(toMacroEvents([row({ baselineQ50: null })])[0]?.horizons[0]?.renderable, false);
    const small = toMacroEvents([row({ sample: 9 })])[0]?.horizons[0];
    assert.ok(small && !small.renderable && small.blockedReason === "insufficient_sample");
  });

  it("모르는 종류는 버리고, 일정은 시각 순이다", () => {
    const events = toMacroEvents([
      row({ kind: "fomc", eventAt: new Date("2026-10-28T18:00:00Z") }),
      row({ kind: "unlock" }),
      row({ kind: "jobs", eventAt: new Date("2026-10-02T12:30:00Z") }),
    ]);
    assert.deepEqual(events.map((e) => e.kind), ["jobs", "fomc"]);
  });

  it("호재 · 악재 판정 필드가 없다", () => {
    const text = JSON.stringify(toMacroEvents([row()]));
    assert.ok(!/bullish|bearish|good|bad|호재|악재/i.test(text));
  });
});
