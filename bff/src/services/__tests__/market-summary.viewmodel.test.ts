import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toMarketSummaryViewModel,
  type ServerMarketSummaryItem,
} from "../market-summary.viewmodel";

const item = (
  overrides: Partial<ServerMarketSummaryItem> = {},
): ServerMarketSummaryItem => ({
  symbol: "BTC",
  koreanName: "비트코인",
  logoUrl: "https://example.test/BTC.png",
  currentPrice: 100,
  change24h: 1,
  change24hAmount: 1,
  tags: [],
  sparkline: [1, 2],
  priceUpdatedAt: null,
  ...overrides,
});

describe("toMarketSummaryViewModel", () => {
  it("서버 순서 · 값을 그대로 옮긴다 — 금액을 다시 계산하지 않는다", () => {
    const vm = toMarketSummaryViewModel({
      featured: item({ change24hAmount: 12345 }),
      items: [item({ symbol: "ETH" })],
      sparklineWindowMinutes: 150,
      degraded: false,
    });
    assert.equal(vm.featured?.change24hAmount, 12345);
    assert.deepEqual(vm.items.map((i) => i.symbol), ["ETH"]);
  });

  it("모르는 태그 코드는 버린다", () => {
    const vm = toMarketSummaryViewModel({
      featured: item({ tags: ["wide_move", "surge"] }),
      items: [],
      sparklineWindowMinutes: 150,
      degraded: false,
    });
    assert.deepEqual(vm.featured?.tags, ["wide_move"]);
  });

  it("점 하나짜리 스파크라인은 null — 선을 그릴 수 없다", () => {
    const vm = toMarketSummaryViewModel({
      featured: null,
      items: [item({ sparkline: [1] })],
      sparklineWindowMinutes: 150,
      degraded: true,
    });
    assert.equal(vm.items[0]?.sparkline, null);
    assert.equal(vm.featured, null);
  });

  it("한글 이름이 없으면 심볼", () => {
    const vm = toMarketSummaryViewModel({
      featured: item({ koreanName: null }),
      items: [],
      sparklineWindowMinutes: 150,
      degraded: false,
    });
    assert.equal(vm.featured?.name, "BTC");
  });
});
