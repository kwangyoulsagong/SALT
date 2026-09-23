import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toPortfolioSummaryViewModel,
  type ServerPortfolioSummary,
} from "../portfolio.viewmodel";

const summary = (
  overrides: Partial<ServerPortfolioSummary> = {},
): ServerPortfolioSummary => ({
  items: [
    { symbol: "BTC", assetType: "crypto", currentValue: 1_000_000, profitRate: 12.5 },
  ],
  totalKrw: 1_000_000,
  fxRateUsed: null,
  fxBasisCode: null,
  ...overrides,
});

const names = (entries: [string, string][]) => new Map(entries);

describe("toPortfolioSummaryViewModel", () => {
  it("시세 목록의 이름을 붙인다", () => {
    const vm = toPortfolioSummaryViewModel(
      summary(),
      names([["BTC", "비트코인"]]),
      false,
    );

    assert.equal(vm.items[0].name, "비트코인");
    assert.equal(vm.items[0].currentValue, 1_000_000);
    assert.equal(vm.namesDegraded, false);
  });

  /** 이름이 없다고 보유가 없는 것은 아니다 — 금액은 그대로 내려간다. */
  it("이름을 못 찾으면 심볼을 쓴다", () => {
    const vm = toPortfolioSummaryViewModel(summary(), names([]), true);

    assert.equal(vm.items[0].name, "BTC");
    assert.equal(vm.items[0].currentValue, 1_000_000);
    assert.equal(vm.namesDegraded, true);
  });

  it("심볼 대소문자가 달라도 이름을 찾는다", () => {
    const vm = toPortfolioSummaryViewModel(
      summary({
        items: [
          { symbol: "btc", assetType: "crypto", currentValue: 1, profitRate: 0 },
        ],
      }),
      names([["BTC", "비트코인"]]),
      false,
    );

    assert.equal(vm.items[0].name, "비트코인");
  });

  it("보유가 없으면 빈 배열과 합계 0 이다", () => {
    const vm = toPortfolioSummaryViewModel(
      summary({ items: [], totalKrw: 0 }),
      names([]),
      false,
    );

    assert.deepEqual(vm.items, []);
    assert.equal(vm.totalKrw, 0);
  });

  /** 서버가 응답 자체를 주지 못한 경우에도 화면이 렌더될 모양은 유지한다. */
  it("응답이 비어도 모양이 무너지지 않는다", () => {
    const vm = toPortfolioSummaryViewModel(undefined, names([]), true);

    assert.deepEqual(vm.items, []);
    assert.equal(vm.totalKrw, 0);
    assert.equal(vm.fxRateUsed, null);
  });

  it("환율 기준은 서버 값을 그대로 전달한다", () => {
    const vm = toPortfolioSummaryViewModel(
      summary({ fxRateUsed: 1390.5, fxBasisCode: "SETTLEMENT" }),
      names([]),
      false,
    );

    assert.equal(vm.fxRateUsed, 1390.5);
    assert.equal(vm.fxBasisCode, "SETTLEMENT");
  });

  it("시세 목록의 로고를 옮기고, 없으면 null 이다", () => {
    const vm = toPortfolioSummaryViewModel(
      summary({
        items: [
          { symbol: "btc", assetType: "crypto", currentValue: 1, profitRate: 0 },
          { symbol: "AAPL", assetType: "stock", currentValue: 1, profitRate: 0 },
        ],
      }),
      names([]),
      false,
      new Map([["BTC", "https://static.upbit.com/logos/BTC.png"]]),
    );

    assert.equal(vm.items[0].logoUrl, "https://static.upbit.com/logos/BTC.png");
    assert.equal(vm.items[1].logoUrl, null);
  });
});
