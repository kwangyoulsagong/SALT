import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachAssetType,
  CoachHolding,
  CoachProfileStore,
  CoachQuote,
  MarketProbe,
  PortfolioProbe,
} from "../../domain";
import { PreflightMode } from "../../domain";
import { CheckTradePreflight } from "../CheckTradePreflight";

/**
 * 주문 전 계산의 자산군 (F004 슬라이스 16 후속 · `SRV-REQ-025` FR-66).
 *
 * 비중 분모는 같은 자산군 보유다. 자산군은 시세 조회가 정하고, 모르면 코인(원문과 같다).
 */

const holding = (symbol: string, assetType: CoachAssetType, currentValue: number): CoachHolding => ({
  symbol,
  assetType,
  totalQuantity: 1,
  averageBuyPrice: currentValue,
  totalInvested: currentValue,
  currentPrice: currentValue,
  currentValue,
  unrealizedProfit: 0,
  unrealizedProfitRate: 0,
  realizedProfit: 0,
});

const HOLDINGS = [
  holding("BTC", "crypto", 900_000),
  holding("005930", "kr_stock", 400_000),
  holding("000660", "kr_stock", 600_000),
];

const quote = (symbol: string, assetType: CoachAssetType): CoachQuote => ({
  symbol,
  assetType,
  koreanName: symbol,
  currentPrice: 100,
  change24h: 0,
  tradeValue24h: 0,
  priceUpdatedAt: null,
});

const build = (quotes: Map<string, CoachQuote>) => {
  const calls: Array<{ method: string; assetType?: CoachAssetType }> = [];
  const portfolio = {
    listHoldings: async (_userId: string, assetType?: CoachAssetType) => {
      calls.push({ method: "listHoldings", assetType });
      return HOLDINGS.filter((row) => !assetType || row.assetType === assetType);
    },
    getHolding: async (_userId: string, symbol: string, assetType: CoachAssetType = "crypto") => {
      calls.push({ method: "getHolding", assetType });
      return HOLDINGS.find((row) => row.symbol === symbol && row.assetType === assetType) ?? null;
    },
  } as unknown as PortfolioProbe;
  const market = { quotes: async () => quotes } as unknown as MarketProbe;
  const profiles = { findByUser: async () => null } as unknown as CoachProfileStore;
  return { useCase: new CheckTradePreflight(market, portfolio, profiles), calls };
};

const command = (symbol: string) => ({
  symbol,
  entryPrice: 100,
  stopLossRate: -0.1,
  takeProfitPrices: [],
  amount: 1_000_000,
  mode: PreflightMode.LongTerm,
});

describe("CheckTradePreflight — 자산군", () => {
  it("국내 주식은 국내 주식 보유만 분모로 본다", async () => {
    const { useCase, calls } = build(new Map([["005930", quote("005930", "kr_stock")]]));
    const result = await useCase.execute("u1", command("005930"));

    assert.equal(result.assetType, "kr_stock");
    assert.deepEqual(
      calls.map((call) => call.assetType),
      ["kr_stock", "kr_stock"]
    );
    // 국내 주식 합 1,000,000 + 이번 1,000,000 · 이 종목 400,000 + 1,000,000
    assert.equal(result.portfolioImpact.totalValue, 1_000_000);
    assert.equal(result.portfolioImpact.existingSymbolValue, 400_000);
    assert.equal(result.calculation.projectedWeight, 0.7);
  });

  it("코인은 코인 보유만 — 국내 주식이 분모에 섞이지 않는다", async () => {
    const { useCase } = build(new Map([["BTC", quote("BTC", "crypto")]]));
    const result = await useCase.execute("u1", command("BTC"));

    assert.equal(result.assetType, "crypto");
    assert.equal(result.portfolioImpact.totalValue, 900_000);
    assert.equal(result.portfolioImpact.existingSymbolValue, 900_000);
  });

  it("시세를 모르면 코인으로 본다 — 원문과 같다", async () => {
    const { useCase, calls } = build(new Map());
    const result = await useCase.execute("u1", command("NEWCOIN"));

    assert.equal(result.assetType, "crypto");
    assert.ok(calls.every((call) => call.assetType === "crypto"));
  });
});
