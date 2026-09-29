import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assembleExplanationFacts,
  makeModeDecision,
  scoreModeDecision,
  type ExplanationMaterials,
  type ForecastReader,
  type JudgmentLedgerDraft,
  type JudgmentLedgerStore,
  type MarketProbe,
  type ModeDecisionInput,
  type TrackedAssetProbe,
} from "../../domain";
import { PublishJudgmentLedger } from "../PublishJudgmentLedger";

/** 예측 원장 (F010 슬라이스 1 · `SRV-REQ-024` FR-178). */

const T0 = new Date("2026-09-29T03:10:00Z");
const TRADED = new Date("2026-09-29T02:59:00Z");

class MemoryLedger implements JudgmentLedgerStore {
  rows: JudgmentLedgerDraft[] = [];
  async publishedOn(asOfDate: Date) {
    return new Set(
      this.rows
        .filter((r) => r.asOfDate.getTime() === asOfDate.getTime())
        .map((r) => `${r.symbol}:${r.mode}`)
    );
  }
  async saveEntries(drafts: JudgmentLedgerDraft[]) {
    this.rows.push(...drafts);
    return drafts.length;
  }
}

let materialCalls = 0;
const market = {
  quotes: async (symbols: string[]) => {
    materialCalls++;
    return new Map(
      symbols
        .filter((s) => s !== "NOPRICE")
        .map((s) => [s, { symbol: s, assetType: "crypto", currentPrice: 100, change24h: 5, priceUpdatedAt: T0 }])
    );
  },
  latestSentiments: async (symbols: string[]) =>
    new Map(
      symbols.map((s) => [
        s,
        { sentimentScore: 50, fearGreedIndex: 20, sentimentLabel: "neutral", priceChange24h: 5, calculatedAt: T0 },
      ])
    ),
  latestIndicators: async (symbols: string[], timeframe: string) =>
    new Map(
      symbols.map((s) => [
        s,
        // BTC 일봉 RSI 20 + 공포탐욕 20 → 국면 panic
        { rsi14: timeframe === "d1" ? 20 : 50, ma20: null, ma50: null, volumeAvg20: null, timestamp: T0 },
      ])
    ),
  recentWhales: async () => [
    { transactionType: "buy", amountKRW: 300, detectedAt: T0, tradedAt: TRADED },
    { transactionType: "sell", amountKRW: 100, detectedAt: T0 },
  ],
} as unknown as MarketProbe;

const tracked = (symbols: string[]): TrackedAssetProbe => ({ listTrackedSymbols: async () => symbols });

describe("PublishJudgmentLedger", () => {
  it("국면 · 종목 변동성 재료를 같이 남기고, 읽기가 실패해도 원장은 나간다(F010 슬라이스 2)", async () => {
    const forecasts = {
      marketRegime: async () => ({
        asOf: T0,
        close: 1,
        sma200d: 1,
        trendOpen: false,
        highVolProbability: 0.8,
        drawdown365d: -0.36,
        gateKey: null,
        gateOpen: true,
        eventFactor: 1,
        nextEventKind: null,
        nextEventAt: null,
        preregKey: "regime-gate@1",
      }),
      symbolRisk: async () => new Map([["ETH", { annualized: 0.7, ewma: 0.7, btcBeta: 1.2, asOf: T0 }]]),
    } as unknown as ForecastReader;
    const ledger = new MemoryLedger();
    await new PublishJudgmentLedger(tracked(["ETH"]), market, ledger, () => T0, forecasts).execute();
    const row = ledger.rows[0]!;
    assert.deepEqual(row.materials.market, {
      trendOpen: false,
      highVolProbability: 0.8,
      drawdown365d: -0.36,
      observedAt: T0.toISOString(),
    });
    assert.deepEqual(row.materials.risk, { annualizedVolatility: 0.7, btcBeta: 1.2, observedAt: T0.toISOString() });
    // 점수는 국면을 모른다 — 같은 재료면 forecasts 유무와 무관하게 같은 점수
    const plain = new MemoryLedger();
    await new PublishJudgmentLedger(tracked(["ETH"]), market, plain, () => T0).execute();
    assert.equal(row.score, plain.rows[0]!.score);
    assert.equal(plain.rows[0]!.materials.market, null);

    const broken = {
      marketRegime: async () => {
        throw new Error("down");
      },
      symbolRisk: async () => {
        throw new Error("down");
      },
    } as unknown as ForecastReader;
    const again = new MemoryLedger();
    const result = await new PublishJudgmentLedger(tracked(["ETH"]), market, again, () => T0, broken).execute();
    assert.equal(result.written, 2);
    assert.equal(again.rows[0]!.materials.risk, null);
  });

  it("추적 종목 × 두 모드를 하루 한 번 — 기여 · 재료 발생 시각 · 국면을 남긴다", async () => {
    const ledger = new MemoryLedger();
    const publish = new PublishJudgmentLedger(tracked(["ETH", "NOPRICE"]), market, ledger, () => T0);

    const result = await publish.execute();

    assert.equal(result.written, 2);
    assert.deepEqual(result.skippedNoPrice, ["NOPRICE"]);
    const scalp = ledger.rows.find((r) => r.mode === "scalp")!;
    assert.equal(scalp.asOfDate.toISOString(), "2026-09-29T00:00:00.000Z");
    assert.equal(scalp.ruleVersion, "mode-decision@2");
    assert.equal(scalp.regime, "panic"); // BTC 재료로 정한다(BTC 는 추적 목록에 없어도)
    // 기여 합 = 점수 − 50
    assert.equal(scalp.components.reduce((a, c) => a + c.points, 0), scalp.score - 50);
    assert.equal(scalp.materials.indicator?.timeframe, "h1");
    assert.equal(scalp.materials.whales?.oldestAt, TRADED.toISOString()); // 발생 시각이 있으면 그것
    assert.equal(scalp.materials.whales?.buyKRW, 300);
    assert.equal(ledger.rows.find((r) => r.mode === "long_term")!.materials.indicator?.timeframe, "d1");
  });

  it("같은 날 두 번째 회차는 재료를 다시 모으지 않는다", async () => {
    const ledger = new MemoryLedger();
    const publish = new PublishJudgmentLedger(tracked(["ETH"]), market, ledger, () => T0);
    await publish.execute();
    materialCalls = 0;

    const again = await publish.execute();

    assert.equal(again.written, 0);
    assert.equal(materialCalls, 0);
  });
});

describe("scoreModeDecision — 기여", () => {
  const base: ModeDecisionInput = {
    mode: "long_term",
    symbol: "BTC",
    change24h: 5,
    sentimentScore: 30,
    rsi: 75,
    whaleBuy: 0,
    whaleSell: 0,
    hasHolding: false,
    missingData: ["whale_flow"],
  };

  it("판단은 makeModeDecision 과 같고, 기여 합이 점수 − 50 이다", () => {
    const { decision, components } = scoreModeDecision(base);
    assert.deepEqual(decision, makeModeDecision(base));
    // 장기(@2): 24h +5% → −6, 심리 30 → 0(가중 0), RSI 75 → −12
    assert.deepEqual(
      components.map((c) => [c.item, c.points]),
      [["change24h", -6], ["sentiment", 0], ["rsi", -12], ["whale_flow", 0], ["missing_data", 0]]
    );
    assert.equal(components.find((c) => c.item === "sentiment")!.value, 30); // 값은 남는다 — 라이브 IC 재료
    assert.equal(decision.score, 50 - 6 - 12);
    assert.equal("components" in decision, false); // 응답 모양에 새지 않는다
  });

  it("재료 없음은 value null — 기여 0 과 가른다", () => {
    const { components } = scoreModeDecision({ ...base, rsi: undefined, sentimentScore: undefined });
    assert.equal(components.find((c) => c.item === "rsi")!.value, null);
    assert.equal(components.find((c) => c.item === "whale_flow")!.value, null);
  });
});

describe("assembleExplanationFacts — 점수에 쓰는 재료만 (mode-decision@2)", () => {
  const materials = (mode: "scalp" | "long_term") => ({
    symbol: "BTC",
    mode,
    quote: { symbol: "BTC", assetType: "crypto", koreanName: "비트코인", currentPrice: 100, change24h: 1, tradeValue24h: 1, priceUpdatedAt: T0 },
    judgment: { label: "관망", headline: "h", reasons: [], risks: [] },
    indicator: { rsi14: 30, ma20: null, ma50: null, volumeAvg20: null, timestamp: T0 },
    sentiment: { sentimentScore: 30, sentimentLabel: "fear", priceChange24h: 0, calculatedAt: T0 },
    whale: { buyAmountKRW: 900, sellAmountKRW: 100, count: 3 },
    news: [],
  }) as unknown as ExplanationMaterials;

  it("단타는 심리를 싣고 대형 체결은 싣지 않는다 · 장기는 둘 다 싣지 않는다", () => {
    const scalp = assembleExplanationFacts(materials("scalp"))!.evidence.map((e) => e.label);
    const longTerm = assembleExplanationFacts(materials("long_term"))!.evidence.map((e) => e.label);
    assert.ok(scalp.includes("시장 심리") && scalp.includes("RSI"));
    assert.ok(!scalp.some((l) => l.startsWith("고래")));
    assert.ok(longTerm.includes("RSI"));
    assert.ok(!longTerm.includes("시장 심리") && !longTerm.some((l) => l.startsWith("고래")));
  });
});
