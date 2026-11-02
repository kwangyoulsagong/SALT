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
  windowFrom: new Date("2018-01-12T13:30:00Z"),
  windowTo: new Date("2026-09-11T12:30:00Z"),
  missCount: 5,
  missJudged: 38,
  eventSymbol: "",
  assetClass: "crypto",
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

describe("사건 반응 성적 4요소 (F009 FR-33)", () => {
  it("빗나간 수의 분모는 판정한 사건 수 — 표본이 아니다", () => {
    const [event] = toMacroEvents([row()]);
    const h1 = event?.horizons[0];
    assert.ok(h1?.renderable);
    assert.deepEqual(h1.claim, {
      period: { present: true, from: "2018-01-12", to: "2026-09-11" },
      sample: 48,
      baseline: { present: true, code: "ordinary_days" },
      misses: { present: true, count: 5, outOf: 38 },
    });
  });
});

describe("toMacroEvents — 국내 일정 (SRV-REQ-041 FR-1 · FR-2 · FR-3)", () => {
  const kr = (over: Partial<EventCardRow> = {}) => row({ assetClass: "kr_stock", ...over });

  it("국내 종목엔 국내 4종 + 미국 거시, 행마다 지역 · 범위", () => {
    const events = toMacroEvents([
      kr({ kind: "kr_bok_rate", eventAt: new Date("2026-11-26T01:00:00Z") }),
      kr({ kind: "fomc", eventAt: new Date("2026-12-09T19:00:00Z") }),
      kr({ kind: "kr_quad_expiry", eventAt: new Date("2026-12-10T00:00:00Z") }),
    ]);
    assert.deepEqual(
      events.map((e) => [e.kind, e.region, e.scope]),
      [
        ["kr_bok_rate", "kr", "market"],
        ["fomc", "us", "market"],
        ["kr_quad_expiry", "kr", "market"],
      ]
    );
  });

  it("코인엔 국내 일정을 싣지 않는다 — 예측이 계산했어도", () => {
    const events = toMacroEvents([row({ kind: "kr_cpi" }), row({ kind: "cpi" })]);
    assert.deepEqual(events.map((e) => e.kind), ["cpi"]);
  });

  it("모르는 종류 · 시장 종류인데 종목이 붙은 행은 버린다", () => {
    const events = toMacroEvents([kr({ kind: "kr_earnings", eventSymbol: "005930" }), kr({ kind: "kr_cpi", eventSymbol: "005930" })]);
    assert.equal(events.length, 0);
  });

  it("같은 시각 · 같은 종류라도 사건 종목이 다르면 다른 일정이다", () => {
    const at = new Date("2026-11-03T23:00:00Z");
    const events = toMacroEvents([kr({ kind: "kr_cpi", eventAt: at }), kr({ kind: "kr_cpi", eventAt: at, horizonDays: 5 })]);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.horizons.filter((h) => h.renderable).length, 2);
  });
});
