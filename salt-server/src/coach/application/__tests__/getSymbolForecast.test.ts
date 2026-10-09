import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GetSymbolForecast } from "../GetSymbolForecast";
import { ForecastNotAvailableError, type ForecastCardRow, type ForecastReader, type PortfolioProbe } from "../../domain";

const reader = (calls: string[]): ForecastReader => ({
  cards: async (symbol) => {
    calls.push(symbol);
    return [];
  },
  recentCloses: async () => [{ date: "2026-09-22", close: 100 }],
  eventCards: async () => [],
});
const portfolio = { getHolding: async () => null } as unknown as PortfolioProbe;

describe("GetSymbolForecast", () => {
  it("소유자가 아니면 404 — 전망을 읽지도 않는다", async () => {
    const calls: string[] = [];
    const useCase = new GetSymbolForecast(reader(calls), portfolio, ["owner@x.com"]);
    await assert.rejects(() => useCase.execute({ userId: "u", email: "friend@x.com" }, "BTC"), ForecastNotAvailableError);
    assert.deepEqual(calls, []);
  });

  it("소유자면 네 기간을 항상 준다 — 행이 없으면 not_generated", async () => {
    const calls: string[] = [];
    const useCase = new GetSymbolForecast(reader(calls), portfolio, ["owner@x.com"]);
    const view = await useCase.execute({ userId: "u", email: "owner@x.com" }, " btc ");
    assert.deepEqual(calls, ["BTC"]);
    assert.deepEqual(view.horizons.map((h) => [h.horizonWeeks, h.blockedReason]), [
      [1, "not_generated"],
      [2, "not_generated"],
      [3, "not_generated"],
      [4, "not_generated"],
    ]);
    assert.equal(view.label, "변동 범위 (방향 예측 아님)");
  });

  it("국내 주식 — 보유를 행의 자산군(kr_stock)으로 읽어 평가 범위를 싣는다 (F011 슬라이스 5b)", async () => {
    const krRow: ForecastCardRow = {
      assetClass: "kr_stock",
      horizonWeeks: 1,
      asOf: new Date("2026-10-08T00:00:00Z"),
      modelVersion: "kr-ens-baseline@0.1.0",
      baseClose: 263_500,
      quantiles: [-0.18, -0.12, -0.05, 0.003, 0.06, 0.13, 0.2],
      pUp: 0.52,
      direction: "abstain",
      renderable: true,
      blockedReason: null,
      rangeRenderable: true,
      rangeBlockedReason: null,
      scoreKind: "backtest",
      sample: 52,
      coverage90: 0.9,
      width90: 0.38,
      baselineWidth90: 0.39,
      pinballSkill: 0.03,
      pinballSkillCiLow: 0.01,
      directionCalls: 0,
      directionHits: 0,
      directionBaseRate: 0.55,
      recentMisses: [{ asOf: "2026-08-03T00:00:00Z", realized: 0.3, q05: -0.15, q95: 0.17 }],
      windowFrom: new Date("2025-10-10T00:00:00Z"),
      windowTo: new Date("2026-09-28T00:00:00Z"),
      missCount: 5,
    };
    const asked: unknown[][] = [];
    const krPortfolio = {
      getHolding: async (...args: unknown[]) => {
        asked.push(args);
        return {
          symbol: "005930",
          assetType: "kr_stock",
          totalQuantity: 10,
          averageBuyPrice: 200_000,
          totalInvested: 2_000_000,
          currentPrice: 263_500,
          currentValue: 2_635_000,
        };
      },
    } as unknown as PortfolioProbe;
    const krReader: ForecastReader = {
      ...reader([]),
      cards: async () => [krRow],
    } as ForecastReader;
    const view = await new GetSymbolForecast(krReader, krPortfolio, ["owner@x.com"]).execute(
      { userId: "u", email: "owner@x.com" },
      "005930"
    );
    assert.deepEqual(asked, [["u", "005930", "kr_stock"]]);
    const h1 = view.horizons[0]!;
    assert.equal(h1.renderable, true);
    assert.equal(h1.basePrice, 263_500);
    assert.ok(h1.scenario, "보유가 있으면 평가 범위가 실린다");
  });

  it("행이 없으면 보유를 읽지 않는다 — 자산군을 모른다", async () => {
    const asked: unknown[] = [];
    const p = {
      getHolding: async (...args: unknown[]) => asked.push(args),
    } as unknown as PortfolioProbe;
    await new GetSymbolForecast(reader([]), p, ["owner@x.com"]).execute(
      { userId: "u", email: "owner@x.com" },
      "005930"
    );
    assert.deepEqual(asked, []);
  });
});
