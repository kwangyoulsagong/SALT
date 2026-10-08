import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PortfolioApi, Transaction } from "../../../portfolio/application/api";
import { HoldingTradeAdapter } from "../HoldingTradeAdapter";

/**
 * `portfolio` → `coach` 거래 · 보유 번역 — 자산군 범위 (F011 슬라이스 4).
 * 리스크 예산은 코인 + 국내 주식 거래를 읽고, 계획은 국내 주식 거래에도 연결된다. 행동 분석은 코인 그대로.
 */

const tx = (id: string, assetType: Transaction["assetType"]): Transaction =>
  ({
    id,
    symbol: id,
    assetType,
    transactionType: "buy",
    quantity: 1,
    price: 100,
    totalAmount: 100,
    fee: 0,
    transactionDate: new Date("2026-10-01T00:00:00Z"),
  }) as Transaction;

const portfolioApi = (rows: Transaction[], asked: Array<string | undefined>): PortfolioApi =>
  ({
    listTransactions: async (_userId: string, options: { assetType?: string; limit?: number }) => {
      asked.push(options.assetType);
      return rows.filter((row) => !options.assetType || row.assetType === options.assetType).slice(0, options.limit);
    },
    getTransaction: async (_userId: string, id: string) => rows.find((row) => row.id === id) ?? null,
  }) as unknown as PortfolioApi;

describe("HoldingTradeAdapter", () => {
  const rows = [tx("BTC", "crypto"), tx("005930", "kr_stock"), tx("AAPL", "stock")];

  it("기본은 코인만 — DB 가 거른다", async () => {
    const asked: Array<string | undefined> = [];
    const result = await new HoldingTradeAdapter(portfolioApi(rows, asked)).listLedgerSince("u1", new Date(0), 10);
    assert.deepEqual(asked, ["crypto"]);
    assert.deepEqual(result.entries.map((e) => e.symbol), ["BTC"]);
  });

  it("여러 자산군이면 전체를 읽고 거른다 — 잘림은 거르기 전 행 수로", async () => {
    const asked: Array<string | undefined> = [];
    const adapter = new HoldingTradeAdapter(portfolioApi(rows, asked));
    const all = await adapter.listLedgerSince("u1", new Date(0), 10, ["crypto", "kr_stock"]);
    assert.deepEqual(asked, [undefined]);
    assert.deepEqual(all.entries.map((e) => e.symbol), ["BTC", "005930"]);
    assert.equal(all.truncated, false);

    // 한도 2 — 미국 주식 행이 세 번째 자리를 차지해 잘렸다. 걸러서 2건이어도 다 읽은 것이 아니다
    const cut = await adapter.listLedgerSince("u1", new Date(0), 2, ["crypto", "kr_stock"]);
    assert.equal(cut.truncated, true);
  });

  it("계획 연결 — 코인 · 국내 주식 거래는 찾고, 미국 주식은 없는 것과 같다", async () => {
    const adapter = new HoldingTradeAdapter(portfolioApi(rows, []));
    assert.equal((await adapter.findLedgerEntry("u1", "005930"))?.symbol, "005930");
    assert.equal((await adapter.findLedgerEntry("u1", "BTC"))?.symbol, "BTC");
    assert.equal(await adapter.findLedgerEntry("u1", "AAPL"), null);
  });
});
