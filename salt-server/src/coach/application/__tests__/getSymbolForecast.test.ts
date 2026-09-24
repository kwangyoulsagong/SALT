import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GetSymbolForecast } from "../GetSymbolForecast";
import { ForecastNotAvailableError, type ForecastReader, type PortfolioProbe } from "../../domain";

const reader = (calls: string[]): ForecastReader => ({
  cards: async (symbol) => {
    calls.push(symbol);
    return [];
  },
  recentCloses: async () => [{ date: "2026-09-22", close: 100 }],
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
});
