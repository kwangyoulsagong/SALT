import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateProfitPlan,
  heldRuleZone,
  OBSERVATION_RULE,
  observationZone,
} from "../index";

/** 스마트 바이존 (F004 · D2 · D12 · D13). */

describe("heldRuleZone — 보유 규칙 가격", () => {
  const holding = {
    currentPrice: 100,
    averageBuyPrice: 90,
    unrealizedProfitRate: 11.1,
  };

  it("익절 계획과 같은 가격을 쓴다 — 두 화면이 다른 손절선을 말하지 않는다", () => {
    const zone = heldRuleZone(holding);
    const plan = calculateProfitPlan(holding);

    assert.equal(zone.kind, "held_rule");
    assert.equal(zone.notPrediction, true);
    assert.deepEqual(
      zone.stages.map((stage) => stage.price),
      plan.stages.map((stage) => stage.price)
    );
    assert.deepEqual(
      zone.stages.map((stage) => stage.key),
      ["protect_loss", "first_profit", "trend_hold"]
    );
    assert.equal(zone.status, plan.status);
  });

  it("priceGap 은 가격 − 현재가 금액이고 부동소수 잡음이 없다", () => {
    // 수익률 > 10 이라 손절선 = 현재가 × 0.94 = 0.282 → 0.28. 그냥 빼면 −0.019999…
    const zone = heldRuleZone({ ...holding, currentPrice: 0.3 });
    assert.equal(zone.stages[0].price, 0.28);
    assert.equal(zone.stages[0].priceGap, -0.02);
  });

  it("수익률 · 퍼센트 필드가 없다 (D13 · FR-114)", () => {
    const keys = JSON.stringify(heldRuleZone(holding));
    assert.doesNotMatch(keys, /rate|percent|return|probability/i);
  });
});

describe("observationZone — 미보유 관찰 구간", () => {
  const scalpEnough = OBSERVATION_RULE.scalp.minSample;

  it("20 · 50 · 80 백분위와 현재가와의 금액 차이를 싣는다", () => {
    const zone = observationZone("scalp", 100, {
      sample: scalpEnough,
      values: [95, 100.5, 104],
    });

    assert.equal(zone.kind, "observation");
    if (zone.kind !== "observation") return;
    assert.deepEqual([zone.lower, zone.mid, zone.upper], [95, 100.5, 104]);
    assert.deepEqual(zone.priceGap, { lower: -5, mid: 0.5, upper: 4 });
    assert.deepEqual(zone.lookback, { timeframe: "m5", days: 1 });
    assert.equal(zone.sample, scalpEnough);
    assert.equal(zone.notPrediction, true);
  });

  it("장기는 1년 일봉이다", () => {
    const zone = observationZone("long_term", 100, {
      sample: OBSERVATION_RULE.long_term.minSample,
      values: [80, 90, 120],
    });
    assert.equal(zone.kind === "observation" && zone.lookback.timeframe, "d1");
  });

  it("캔들이 기대치의 절반보다 적으면 insufficient_price_history", () => {
    assert.deepEqual(
      observationZone("scalp", 100, { sample: scalpEnough - 1, values: [1, 2, 3] }),
      { kind: "unavailable", reasonCode: "insufficient_price_history" }
    );
    assert.deepEqual(
      observationZone("long_term", 100, { sample: 0, values: null }),
      { kind: "unavailable", reasonCode: "insufficient_price_history" }
    );
  });

  it("수익률 · 퍼센트 · 확률 필드가 없다 (FR-44)", () => {
    const zone = observationZone("scalp", 100, {
      sample: scalpEnough,
      values: [95, 100, 104],
    });
    assert.doesNotMatch(
      JSON.stringify(Object.keys(zone)),
      /rate|percent|return|probability|target/i
    );
  });
});

describe("게이지 구간 (FR-57)", () => {
  it("20 단위 5구간이고 100 은 마지막 구간이다", async () => {
    const { gaugeBucketCode, gaugeBucketIndex } = await import("../index");
    assert.deepEqual(
      [0, 19, 20, 59, 80, 100].map((v) => gaugeBucketCode(gaugeBucketIndex(v))),
      ["0_20", "0_20", "20_40", "40_60", "80_100", "80_100"]
    );
  });
});
