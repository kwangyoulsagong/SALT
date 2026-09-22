import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { change24hAmountOf, MarketSummaryTag, summaryTagsOf } from "../index";

describe("summaryTagsOf — 방향을 말하지 않는 태그 (SRV-REQ-036)", () => {
  const policy = { wideMoveRate: 5 };

  it("임계 이상이면 오름 · 내림 모두 wide_move 하나다", () => {
    assert.deepEqual(summaryTagsOf(5, policy), [MarketSummaryTag.WideMove]);
    assert.deepEqual(summaryTagsOf(-7.2, policy), [MarketSummaryTag.WideMove]);
  });

  it("임계 미만이면 태그가 없다", () => {
    assert.deepEqual(summaryTagsOf(4.99, policy), []);
    assert.deepEqual(summaryTagsOf(0, policy), []);
  });
});

describe("change24hAmountOf — 변동률로 기준가를 되짚는다", () => {
  it("현재가 110, +10% 면 기준가 100 → +10", () => {
    assert.ok(Math.abs(change24hAmountOf(110, 10)! - 10) < 1e-9);
  });

  it("현재가 90, -10% 면 기준가 100 → -10", () => {
    assert.ok(Math.abs(change24hAmountOf(90, -10)! + 10) < 1e-9);
  });

  it("변동 0 이면 0", () => {
    assert.equal(change24hAmountOf(1000, 0), 0);
  });

  it("가격이 없거나 -100% 이하면 null — 0 으로 떨어뜨리지 않는다", () => {
    assert.equal(change24hAmountOf(0, 3), null);
    assert.equal(change24hAmountOf(100, -100), null);
    assert.equal(change24hAmountOf(100, Number.NaN), null);
  });
});
