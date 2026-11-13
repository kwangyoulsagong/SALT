import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GetSymbolScenario } from "../GetSymbolScenario";
import type { BaseRateReader, BaseRateRow, BaseRateTriggerRow, MarketProbe, ShortHorizonReader } from "../../domain";

const NOW = new Date("2026-11-13T03:00:00Z");
const REF_AT = new Date("2026-11-12T07:00:00Z");

const market = (assetType: string, price: number | null = 10_000): MarketProbe =>
  ({
    quotes: async (s: string[]) =>
      new Map(s.map((x) => [x, { assetType, currentPrice: price, priceUpdatedAt: NOW, openPrice: null, tradeValue24h: null }])),
  }) as unknown as MarketProbe;

const models = (calls: string[], fail = false): ShortHorizonReader => ({
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

const usual = (m: "kr" | "crypto", horizon: number): BaseRateRow => ({
  market: m,
  conditionId: "ALL",
  horizon,
  asOf: NOW,
  kind: "usual",
  status: "ok",
  sample: 1000,
  sampleEff: 500,
  sampleDays: 300,
  upRate: 0.4,
  upLow: 0.36,
  upHigh: 0.44,
  mean: 0,
  q10: -0.05,
  q50: 0,
  q90: 0.04,
  holdUpRate: 0.44,
  holdQ10: -0.04,
  holdQ50: 0,
  holdQ90: 0.04,
  differs: null,
  recentDiffers: null,
});
const K1: BaseRateRow = { ...usual("kr", 1), conditionId: "K1", kind: "test", holdUpRate: 0.51, differs: "higher" };
const trigger: BaseRateTriggerRow = {
  conditionId: "K1",
  appliesTo: "next",
  refClose: 11_000,
  refAt: REF_AT,
  priceAtLeast: null,
  priceAtMost: 10_500,
  openAtLeast: null,
  valueAtLeast: null,
};

const rates = (calls: string[], rows: BaseRateRow[], triggers: BaseRateTriggerRow[] = [], fail = false): BaseRateReader => ({
  stats: async (m) => {
    calls.push(`stats:${m}`);
    if (fail) throw new Error("view missing");
    return rows;
  },
  triggers: async (s, m) => {
    calls.push(`triggers:${s}:${m}`);
    return triggers;
  },
});

const OWNERS = ["owner@x.com"];
const friend = { userId: "u", email: "friend@x.com" };
const owner = { userId: "o", email: "owner@x.com" };

describe("GetSymbolScenario — 모든 종목 · 지평 넷에 늘(SRV-REQ-053 FR-10)", () => {
  it("소유자가 아니어도 본다 — 모델 뷰는 읽지 않고 과거 실제 결과 넷", async () => {
    const calls: string[] = [];
    const uc = new GetSymbolScenario(models(calls), rates(calls, [usual("crypto", 1), usual("crypto", 5)]), market("crypto"), OWNERS, () => NOW);
    const v = await uc.execute(friend, "btc");
    assert.equal(v.symbol, "BTC");
    assert.deepEqual(calls.sort(), ["stats:crypto", "triggers:BTC:crypto"]);
    assert.deepEqual(v.horizons.map((h) => [h.horizon, h.source, h.tier, h.fallbackFrom]), [
      ["1h", "base_rate", "longer", "1d"],
      ["4h", "base_rate", "longer", "1d"],
      ["1d", "base_rate", "usual", null],
      ["5d", "base_rate", "usual", null],
    ]);
    assert.ok(v.horizons.every((h) => h.model === null && h.baseRate?.upCount100 === 44));
  });

  it("소유자는 모델 칸도 읽는다 — 시험을 못 넘은 칸은 시험 상태를 달고 과거 실제 결과", async () => {
    const calls: string[] = [];
    const uc = new GetSymbolScenario(models(calls), rates(calls, [usual("kr", 1), usual("kr", 5)]), market("kr_stock"), OWNERS, () => NOW);
    const v = await uc.execute(owner, " 005930 ");
    assert.equal(v.market, "kr");
    assert.deepEqual(calls.sort(), ["cells:kr", "pred:005930:kr", "stats:kr", "triggers:005930:kr"]);
    assert.deepEqual(v.horizons.map((h) => h.source), ["base_rate", "base_rate", "base_rate", "base_rate"]);
    assert.deepEqual(v.horizons.map((h) => h.model?.blockedReason ?? null), ["not_tested", "not_tested", "not_tested", null]);
  });

  it("지금 성립한 조건이 있으면 그 조건의 결과(점검 한 줄과 같은 판정)", async () => {
    const uc = new GetSymbolScenario(models([]), rates([], [usual("kr", 1), usual("kr", 5), K1], [trigger]), market("kr_stock"), OWNERS, () => NOW);
    const v = await uc.execute(friend, "005930");
    const day = v.horizons.find((h) => h.horizon === "1d")!;
    assert.deepEqual([day.tier, day.baseRate?.condition?.id, day.baseRate?.upCount100, day.baseRate?.differsFromUsual], ["now", "K1", 51, "higher"]);
    // 5일엔 K1 행이 없다 → 평소
    assert.equal(v.horizons.find((h) => h.horizon === "5d")!.tier, "usual");
  });

  it("기저율 뷰 읽기가 실패해도 500 이 아니라 결함 단 — 칸은 넷 그대로", async () => {
    const uc = new GetSymbolScenario(models([]), rates([], [], [], true), market("crypto"), OWNERS, () => NOW);
    const v = await uc.execute(friend, "BTC");
    assert.deepEqual(v.horizons.map((h) => h.tier), ["defect", "defect", "defect", "defect"]);
    assert.ok(v.horizons.every((h) => h.baseRate !== null));
  });

  it("모델 뷰 읽기가 실패해도 과거 실제 결과는 그대로", async () => {
    const uc = new GetSymbolScenario(models([], true), rates([], [usual("crypto", 1)]), market("crypto"), OWNERS, () => NOW);
    const v = await uc.execute(owner, "BTC");
    assert.equal(v.horizons[2].tier, "usual");
    assert.equal(v.horizons[2].model?.blockedReason, "not_tested");
  });
});
