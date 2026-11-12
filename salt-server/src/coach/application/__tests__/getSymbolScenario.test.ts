import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GetSymbolScenario } from "../GetSymbolScenario";
import { ForecastNotAvailableError, type MarketProbe, type ShortHorizonReader } from "../../domain";

const market = (assetType: string): MarketProbe =>
  ({ quotes: async (s: string[]) => new Map(s.map((x) => [x, { assetType }])) }) as unknown as MarketProbe;

const reader = (calls: string[], fail = false): ShortHorizonReader => ({
  cells: async (m) => {
    calls.push(`cells:${m}`);
    if (fail) throw new Error("relation does not exist");
    return [];
  },
  predictions: async (s, m) => {
    calls.push(`pred:${s}:${m}`);
    return [];
  },
});

describe("GetSymbolScenario", () => {
  it("소유자가 아니면 404 — 뷰를 읽지도 않는다", async () => {
    const calls: string[] = [];
    const uc = new GetSymbolScenario(reader(calls), market("crypto"), ["owner@x.com"]);
    await assert.rejects(() => uc.execute({ userId: "u", email: "friend@x.com" }, "BTC"), ForecastNotAvailableError);
    assert.deepEqual(calls, []);
  });

  it("국내 종목은 국내 칸을 묻는다 · 행이 없으면 지평 셋 not_tested", async () => {
    const calls: string[] = [];
    const uc = new GetSymbolScenario(reader(calls), market("kr_stock"), ["owner@x.com"]);
    const v = await uc.execute({ userId: "u", email: "owner@x.com" }, " 005930 ");
    assert.equal(v.market, "kr");
    assert.deepEqual(calls.sort(), ["cells:kr", "pred:005930:kr"]);
    assert.deepEqual(v.horizons.map((h) => h.blockedReason), ["not_tested", "not_tested", "not_tested"]);
  });

  it("뷰 읽기가 실패해도 500 이 아니라 not_tested", async () => {
    const uc = new GetSymbolScenario(reader([], true), market("crypto"), ["owner@x.com"]);
    const v = await uc.execute({ userId: "u", email: "owner@x.com" }, "btc");
    assert.equal(v.symbol, "BTC");
    assert.deepEqual(v.horizons.map((h) => h.renderable), [false, false, false]);
  });
});
