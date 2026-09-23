import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { priceGap, toBehaviorFact } from "../policy";

/**
 * 행동 기록 · 가격선 거리 (`SRV-REQ-025` FR-8 · 16 · 17 · `SRV-REQ-024` FR-41 · 60 · 61).
 *
 * 입력은 **DB 에서 읽은 JSON** 이라 모양을 믿지 않는 쪽을 주로 본다.
 */

describe("toBehaviorFact", () => {
  it("판정 payload 를 코드와 수치로 바꾼다 — 예시 배열은 싣지 않는다", () => {
    const fact = toBehaviorFact({
      kind: "panic_sell",
      windowHours: 24,
      sellCount: 4,
      lossSellCount: 2,
      avgSellLossRate: 0.05,
      examples: [{ symbol: "BTC", lossRate: 0.05, soldAt: "2026-09-01" }],
    });

    assert.deepEqual(fact, {
      factCode: "panic_sell",
      params: {
        windowHours: 24,
        sellCount: 4,
        lossSellCount: 2,
        avgSellLossRate: 0.05,
      },
      amountKrw: null,
    });
  });

  it("세 판정을 전부 읽는다", () => {
    const over = toBehaviorFact({
      kind: "over_trading",
      windowHours: 24,
      trades: 15,
      threshold: 12,
      symbols: ["BTC"],
    });
    const chasing = toBehaviorFact({
      kind: "chasing_high",
      windowHours: 48,
      buyCount: 3,
      highChaseCount: 2,
      thresholdRatio: 0.98,
    });

    assert.equal(over?.factCode, "over_trading");
    assert.deepEqual(over?.params, { windowHours: 24, trades: 15, threshold: 12 });
    assert.equal(chasing?.factCode, "chasing_high");
  });

  it("문장이 없다 — 값이 전부 숫자다", () => {
    const fact = toBehaviorFact({
      kind: "over_trading",
      windowHours: 24,
      trades: 15,
      threshold: 12,
    });

    for (const value of Object.values(fact!.params)) {
      assert.equal(typeof value, "number");
    }
  });

  it("모르는 kind · 빠진 수치 · null 이면 null 이다 — 반쯤 채운 params 를 주지 않는다", () => {
    assert.equal(toBehaviorFact(null), null);
    assert.equal(toBehaviorFact({ kind: "unknown", windowHours: 24 }), null);
    assert.equal(
      toBehaviorFact({ kind: "over_trading", windowHours: 24, trades: 15 }),
      null
    );
    assert.equal(
      toBehaviorFact({ kind: "over_trading", windowHours: "24", trades: 15, threshold: 12 }),
      null
    );
  });
});

describe("priceGap", () => {
  it("가격선이 위면 양수 · 아래면 음수다", () => {
    assert.equal(priceGap(1100, 1000), 100);
    assert.equal(priceGap(920, 1000), -80);
  });

  it("부동소수 뺄셈 잡음이 남지 않는다", () => {
    assert.equal(priceGap(0.3, 0.1), 0.2);
  });
});
