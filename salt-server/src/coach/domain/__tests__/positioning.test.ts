import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toPositioning, type PositioningRow, type SignalReactionRow } from "../policy";

const NOW = new Date("2026-09-27T06:00:00Z");

const state = (over: Partial<PositioningRow> = {}): PositioningRow => ({
  asOf: new Date("2026-09-27T00:00:00Z"),
  barOpen: new Date("2026-09-26T00:00:00Z"),
  fundingRate: 0.00012,
  fundingPct1y: 0.95,
  fundingSample: 365,
  fundingState: "long_crowded",
  oiUsd: 7.9e9,
  oiAt: new Date("2026-09-27T04:00:00Z"),
  oiChange7d: -0.08,
  kimchiPremium: 0.004,
  kimchiState: "discount",
  kimchiSince: new Date("2026-09-20T00:00:00Z"),
  fxUsdKrw: 1355.05,
  fxObservedAt: new Date("2026-09-25T00:00:00Z"),
  ...over,
});

const stats = (kind: string, horizonDays: number, over: Partial<SignalReactionRow> = {}): SignalReactionRow => ({
  kind,
  horizonDays,
  asOf: new Date("2026-09-27T00:00:00Z"),
  sample: 20,
  q05: -0.05,
  q25: -0.01,
  q50: 0.01,
  q75: 0.03,
  q95: 0.15,
  upRate: 0.6,
  baselineQ05: -0.04,
  baselineQ50: 0.001,
  baselineQ95: 0.05,
  moveRatio: 1.2,
  preReturn5dMedian: 0.01,
  recentMisses: [{ eventAt: "2025-01-01T00:00:00Z", realized: 0.2, low: -0.05, high: 0.1 }],
  recentEvents: [{ eventAt: "2026-09-20T00:00:00Z", realized: 0.01, preReturn5d: null }],
  renderable: true,
  blockedReason: null,
  ...over,
});

describe("toPositioning (FC-REQ-007 · SRV-REQ-037 FR-11)", () => {
  it("상태가 없으면 not_generated, 사흘 넘게 안 돌았으면 stale_inputs — 둘 다 상태 · 반응을 싣지 않는다", () => {
    assert.deepEqual(toPositioning(null, [], NOW), {
      asOf: null,
      blockedReason: "not_generated",
      funding: null,
      kimchi: null,
      reactions: [],
    });
    const stale = toPositioning(state({ asOf: new Date("2026-09-23T00:00:00Z") }), [stats("kimchi_cross_up", 1)], NOW);
    assert.equal(stale.blockedReason, "stale_inputs");
    assert.equal(stale.funding, null);
    assert.deepEqual(stale.reactions, []);
  });

  it("지금 쏠림과 20일 안의 교차만 current — 빠진 기간은 not_generated", () => {
    const view = toPositioning(state(), [stats("funding_long_crowded", 1), stats("kimchi_cross_down", 5)], NOW);
    assert.equal(view.funding?.state, "long_crowded");
    assert.equal(view.kimchi?.confirmedState, "discount");
    const current = view.reactions.filter((r) => r.current).map((r) => r.kind);
    assert.deepEqual(current, ["funding_long_crowded", "kimchi_cross_down"]);
    const long = view.reactions.find((r) => r.kind === "funding_long_crowded");
    assert.deepEqual(
      long?.horizons.map((h) => (h.renderable ? h.horizonDays : `${h.horizonDays}:${h.blockedReason}`)),
      [1, "5:not_generated", "20:not_generated"]
    );
  });

  it("오래된 교차는 current 가 아니다", () => {
    const view = toPositioning(state({ kimchiSince: new Date("2026-08-01T00:00:00Z") }), [], NOW);
    assert.ok(view.reactions.every((r) => !r.kind.startsWith("kimchi") || !r.current));
  });

  it("빗나간 때가 없으면 분포를 싣지 않는다 — 주요 사건과 같은 게이트", () => {
    const view = toPositioning(state(), [stats("funding_long_crowded", 1, { recentMisses: [] })], NOW);
    const h = view.reactions.find((r) => r.kind === "funding_long_crowded")?.horizons[0];
    assert.deepEqual(h, { horizonDays: 1, renderable: false, blockedReason: "failure_cases_missing" });
  });

  it("미결제약정이 하루 넘게 지났으면 싣지 않고, 환율이 없으면 김프 칸 · 김프 반응이 없다", () => {
    const view = toPositioning(state({ oiAt: new Date("2026-09-25T00:00:00Z"), fxUsdKrw: null }), [], NOW);
    assert.equal(view.funding?.openInterest, null);
    assert.equal(view.kimchi, null);
    assert.deepEqual(
      view.reactions.map((r) => r.kind),
      ["funding_long_crowded", "funding_short_crowded"]
    );
  });

  it("펀딩 상태 코드를 모르면 펀딩 칸이 없다 — 판정 문자열을 만들지 않는다", () => {
    const view = toPositioning(state({ fundingState: "overheated" }), [], NOW);
    assert.equal(view.funding, null);
  });
});
