import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { withoutExchangeWarning } from "../policy/candidates";

describe("withoutExchangeWarning — 추천 후보에서 투자유의 종목 제외 (FR-193)", () => {
  const ranked = [
    { action: "buy", symbol: "ABC" },
    { action: "sell", symbol: "ABC" },
    { action: "buy", symbol: "BTC" },
    { action: "hold", symbol: "ETH" },
  ];

  it("유의 종목의 모든 후보(보유 매도 포함)를 빼고 남은 순서를 지킨다", () => {
    const flags = new Map([
      ["ABC", { warning: true }],
      ["ETH", { warning: false }],
    ]);
    assert.deepEqual(
      withoutExchangeWarning(ranked, flags).map((c) => `${c.action}:${c.symbol}`),
      ["buy:BTC", "hold:ETH"]
    );
  });

  it("주의만 켜졌거나 표시가 없으면 그대로다", () => {
    assert.deepEqual(withoutExchangeWarning(ranked, new Map([["ABC", { warning: false }]])), ranked);
    assert.deepEqual(withoutExchangeWarning(ranked, new Map()), ranked);
  });
});
