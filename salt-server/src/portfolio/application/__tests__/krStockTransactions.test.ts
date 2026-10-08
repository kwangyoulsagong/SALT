import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  Holding,
  HoldingRepository,
  KrStockQuoteSource,
  PortfolioAssetType,
  TransactionRepository,
} from "../../domain";
import { RevalueKrStockHoldings } from "../ReadPortfolio";
import { RecordTransaction } from "../RecordTransaction";

/** F011 슬라이스 3b — 거래 입력이 국내 주식을 받는다 */

const holding = (over: Partial<Holding>): Holding => ({
  id: "h1",
  userId: "u1",
  symbol: "005930",
  assetType: "kr_stock",
  totalQuantity: 10,
  averageBuyPrice: 70_000,
  totalInvested: 700_000,
  currentPrice: 0,
  currentValue: 0,
  unrealizedProfit: 0,
  unrealizedProfitRate: 0,
  realizedProfit: 0,
  ...over,
});

const fakes = (opts: { held?: Holding | null; price?: number | null; tradable?: boolean } = {}) => {
  const calls = {
    assert: [] as Array<{ email?: string; code: string }>,
    findOne: [] as PortfolioAssetType[],
    created: [] as Array<{ assetType: PortfolioAssetType; symbol: string }>,
    saved: [] as PortfolioAssetType[],
    valued: [] as Array<{ id: string; currentPrice: number; currentValue: number }>,
  };
  const krStock: KrStockQuoteSource = {
    assertTradable: async (email, code) => {
      calls.assert.push({ email, code });
      if (opts.tradable === false) throw new Error("not available");
    },
    prices: async (codes) =>
      opts.price == null ? [] : codes.map((symbol) => ({ symbol, currentPrice: opts.price! })),
  };
  const holdings = {
    findOne: async (_u: string, _s: string, assetType: PortfolioAssetType) => {
      calls.findOne.push(assetType);
      return opts.held === undefined ? holding({}) : opts.held;
    },
    save: async (_u: string, _s: string, assetType: PortfolioAssetType) => {
      calls.saved.push(assetType);
    },
    remove: async () => {},
    applyValuation: async (id: string, v: { currentPrice: number; currentValue: number }) => {
      calls.valued.push({ id, currentPrice: v.currentPrice, currentValue: v.currentValue });
    },
  } as unknown as HoldingRepository;
  const transactions = {
    create: async (input: { assetType: PortfolioAssetType; symbol: string }) => {
      calls.created.push({ assetType: input.assetType, symbol: input.symbol });
      return { id: "t1", ...input };
    },
    findForRecalculation: async () => [
      { transactionType: "buy", quantity: 10, price: 70_000, totalAmount: 700_000, fee: 0 },
    ],
  } as unknown as TransactionRepository;
  return { calls, useCase: new RecordTransaction(transactions, holdings, krStock) };
};

const buy = { userId: "u1", email: "owner@x.com", transactionType: "buy" as const, quantity: 10, price: 70_000, fee: 0 };

describe("RecordTransaction — 국내 주식", () => {
  it("assetType 을 주지 않으면 코인이고 국내 주식 확인을 부르지 않는다", async () => {
    const { calls, useCase } = fakes();
    await useCase.execute({ ...buy, symbol: "btc" });
    assert.deepEqual(calls.created, [{ assetType: "crypto", symbol: "BTC" }]);
    assert.equal(calls.assert.length, 0);
    assert.equal(calls.valued.length, 0, "코인 평가는 BFF 가 밀어 넣는다");
  });

  it("kr_stock 은 종목을 확인하고 저장된 현재가로 바로 평가한다", async () => {
    const { calls, useCase } = fakes({ price: 72_000 });
    await useCase.execute({ ...buy, assetType: "kr_stock", symbol: "005930" });
    assert.deepEqual(calls.assert, [{ email: "owner@x.com", code: "005930" }]);
    assert.deepEqual(calls.created, [{ assetType: "kr_stock", symbol: "005930" }]);
    assert.deepEqual(calls.saved, ["kr_stock"]);
    assert.deepEqual(calls.valued, [{ id: "h1", currentPrice: 72_000, currentValue: 720_000 }]);
  });

  it("확인을 통과하지 못하면 거래를 만들지 않는다", async () => {
    const { calls, useCase } = fakes({ tradable: false });
    await assert.rejects(useCase.execute({ ...buy, assetType: "kr_stock", symbol: "999999" }));
    assert.equal(calls.created.length, 0);
  });

  it("매도 보유 확인은 같은 자산군에서 한다", async () => {
    const { calls, useCase } = fakes({ price: 72_000 });
    await useCase.execute({ ...buy, transactionType: "sell", quantity: 3, assetType: "kr_stock", symbol: "005930" });
    assert.deepEqual(calls.findOne[0], "kr_stock");
  });

  it("시세가 아직 없으면 평가를 건드리지 않는다(빈 값으로 덮지 않는다)", async () => {
    const { calls, useCase } = fakes({ price: null });
    await useCase.execute({ ...buy, assetType: "kr_stock", symbol: "005930" });
    assert.equal(calls.valued.length, 0);
  });

  it("단가가 호가 단위 배수가 아니어도 막지 않는다(수동 입력 원칙)", async () => {
    const { calls, useCase } = fakes({ price: 72_000 });
    await useCase.execute({ ...buy, price: 70_050, assetType: "kr_stock", symbol: "005930" });
    assert.equal(calls.created.length, 1);
  });
});

describe("RevalueKrStockHoldings", () => {
  it("보유 코드 · 현재가 · 보유 행을 한 번씩 읽고 시세 있는 보유만 평가한다", async () => {
    const reads: string[] = [];
    const valued: Array<{ id: string; currentValue: number }> = [];
    const holdings = {
      distinctSymbols: async (assetType: PortfolioAssetType) => {
        reads.push(`codes:${assetType}`);
        return ["005930", "000660"];
      },
      findBySymbols: async (symbols: string[], assetType: PortfolioAssetType) => {
        reads.push(`rows:${assetType}:${symbols.join(",")}`);
        return [holding({ id: "a" }), holding({ id: "b", userId: "u2", totalQuantity: 1, totalInvested: 70_000 })];
      },
      applyValuation: async (id: string, v: { currentValue: number }) => {
        valued.push({ id, currentValue: v.currentValue });
      },
    } as unknown as HoldingRepository;
    const krStock: KrStockQuoteSource = {
      assertTradable: async () => {},
      // 000660 은 시세가 없다
      prices: async () => [{ symbol: "005930", currentPrice: 80_000 }],
    };

    const result = await new RevalueKrStockHoldings(holdings, krStock).execute();

    assert.deepEqual(reads, ["codes:kr_stock", "rows:kr_stock:005930"]);
    assert.deepEqual(valued, [
      { id: "a", currentValue: 800_000 },
      { id: "b", currentValue: 80_000 },
    ]);
    assert.deepEqual(result, { holdings: 2 });
  });

  it("국내 주식 보유가 없으면 시세를 읽지 않는다", async () => {
    let priced = 0;
    const holdings = { distinctSymbols: async () => [] } as unknown as HoldingRepository;
    const krStock: KrStockQuoteSource = {
      assertTradable: async () => {},
      prices: async () => {
        priced += 1;
        return [];
      },
    };
    await new RevalueKrStockHoldings(holdings, krStock).execute();
    assert.equal(priced, 0);
  });
});
