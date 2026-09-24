import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isForecastOwner, toForecastHorizon, type ForecastCardRow } from "../policy";
import type { CoachHolding } from "../model";

/**
 * 가격 전망 카드 (F008 `SRV-REQ-037` · `ADR-003`). 숫자는 Python 이 채점한 것이고 여기는 환산 · 게이트만.
 */

const row = (over: Partial<ForecastCardRow> = {}): ForecastCardRow => ({
  horizonWeeks: 2,
  asOf: new Date("2026-09-23T00:00:00Z"),
  modelVersion: "ens-baseline@0.1.0",
  baseClose: 100_000_000,
  quantiles: [-0.1, -0.07, -0.03, 0.001, 0.03, 0.07, 0.1],
  pUp: 0.51,
  direction: "abstain",
  renderable: false,
  blockedReason: "underperforms_baseline",
  rangeRenderable: true,
  rangeBlockedReason: null,
  scoreKind: "backtest",
  sample: 52,
  coverage90: 0.885,
  width90: 0.2,
  baselineWidth90: 0.19,
  pinballSkill: -0.01,
  pinballSkillCiLow: -0.03,
  directionCalls: 0,
  directionHits: 0,
  directionBaseRate: null,
  recentMisses: [{ asOf: "2026-08-10T00:00:00Z", realized: -0.15, q05: -0.1, q95: 0.1 }],
  ...over,
});

const holding = (quantity: number): CoachHolding => ({
  symbol: "BTC",
  totalQuantity: quantity,
  averageBuyPrice: 90_000_000,
  totalInvested: 90_000_000 * quantity,
  currentPrice: 100_000_000,
  currentValue: 100_000_000 * quantity,
  unrealizedProfit: 0,
  unrealizedProfitRate: 0,
  realizedProfit: 0,
});

describe("toForecastHorizon", () => {
  it("분위수를 기준가 × e^q 로 환산하고 원화는 정수다", () => {
    const v = toForecastHorizon(row(), null);
    assert.equal(v.renderable, true);
    assert.equal(v.range?.low, Math.round(100_000_000 * Math.exp(-0.1)));
    assert.equal(v.range?.high, Math.round(100_000_000 * Math.exp(0.1)));
    assert.equal(v.range?.coverage, 90);
    assert.equal(v.scenario, null); // 보유 없음
  });

  it("보유 수량이 있으면 '이 주에 판다면' 평가금액 변화 범위를 싣는다", () => {
    const v = toForecastHorizon(row(), holding(0.5));
    assert.ok(v.scenario);
    assert.equal(v.scenario.valueChangeLow, Math.round(0.5 * (v.range!.low - 100_000_000)));
    assert.ok(v.scenario.valueChangeLow < 0 && v.scenario.valueChangeHigh > 0);
  });

  it("기준을 못 이긴 기간에는 방향 필드 자체가 없다", () => {
    const v = toForecastHorizon(row(), null);
    assert.equal("direction" in v, false);
    const won = toForecastHorizon(row({ renderable: true, direction: "up", pUp: 0.6, directionCalls: 30, directionHits: 18, directionBaseRate: 0.55 }), null);
    assert.equal(won.direction?.baseRate, 0.55); // 적중률은 기저율과 한 묶음
  });

  it("빗나간 사례가 없으면 범위를 싣지 않는다 — 전망 3종", () => {
    const v = toForecastHorizon(row({ recentMisses: [] }), null);
    assert.equal(v.renderable, false);
    assert.equal(v.blockedReason, "failure_cases_missing");
    assert.equal(v.range, null);
  });

  it("보정이 막히면 사유만 — 숫자 0건", () => {
    const v = toForecastHorizon(row({ rangeRenderable: false, rangeBlockedReason: "miscalibrated" }), holding(1));
    assert.deepEqual([v.renderable, v.blockedReason, v.range, v.scenario, v.trackRecord], [false, "miscalibrated", null, null, null]);
  });

  it("커버리지는 폭 · 기준 폭과 함께만 나간다", () => {
    const v = toForecastHorizon(row({ baselineWidth90: null }), null);
    assert.equal(v.renderable, false);
  });

  it("목표가 · 기대수익 · 확신 같은 필드가 없다", () => {
    const keys = JSON.stringify(toForecastHorizon(row(), holding(1)));
    for (const banned of ["targetPrice", "expectedReturn", "confidence"]) assert.equal(keys.includes(banned), false);
  });
});

describe("isForecastOwner", () => {
  it("대소문자 · 공백을 무시하고, 목록이 비면 아무도 아니다", () => {
    assert.equal(isForecastOwner(" Me@Example.com ", ["me@example.com"]), true);
    assert.equal(isForecastOwner("other@example.com", ["me@example.com"]), false);
    assert.equal(isForecastOwner("me@example.com", []), false);
    assert.equal(isForecastOwner(undefined, ["me@example.com"]), false);
  });
});
