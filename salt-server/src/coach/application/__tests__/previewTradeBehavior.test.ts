import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import type {
  CoachLedgerEntry,
  CoachProfileStore,
  DecisionOutcome,
  DecisionOutcomeStore,
  ForecastReader,
  MarketProbe,
  PortfolioProbe,
  TradePlan,
  TradePlanStore,
} from "../../domain";
import { CheckTradeSize } from "../CheckTradeSize";
import { PreviewTradeBehavior } from "../PreviewTradeBehavior";

/**
 * 입력 중 행동 미리보기 (`SRV-REQ-038` FR-12) — 엣지 없음 한 줄 · 매도 프레이밍 · 사이즈 계산과 따로 실패.
 */

const NOW = new Date("2026-03-01T12:00:00Z");

const tx = (id: string, side: "buy" | "sell", iso: string, price: number): CoachLedgerEntry => ({
  id,
  symbol: "BTC",
  side,
  quantity: 1,
  price,
  totalAmount: price,
  fee: 0,
  transactionDate: new Date(iso),
});

const outcome = (index: number, netReturn: number): DecisionOutcome => ({
  id: `o${index}`,
  userId: "u1",
  planId: null,
  closingTransactionId: `s${index}`,
  symbol: "BTC",
  openedAt: NOW,
  closedAt: NOW,
  holdingDays: new Decimal(1),
  quantity: new Decimal(1),
  netPnlKrw: new Decimal(netReturn * 100),
  feesKrw: new Decimal(0),
  netReturn: new Decimal(netReturn),
  rMultiple: null,
  benchmarkReturn: null,
  adherenceLabel: null,
  autoTags: ["off_plan"],
  userTags: [],
  userTagsConfirmedAt: null,
  sampleOrigin: "live",
  computedAt: NOW,
});

const setup = (options: {
  ledger?: CoachLedgerEntry[];
  truncated?: boolean;
  outcomes?: DecisionOutcome[];
  plans?: Array<Partial<TradePlan>>;
  high?: number | null;
  price?: number | null;
}) => {
  const portfolio = {
    listLedgerSince: async () => ({ entries: options.ledger ?? [], truncated: options.truncated ?? false }),
  } as unknown as PortfolioProbe;
  const plans = {
    listOwned: async () => options.plans ?? [],
  } as unknown as TradePlanStore;
  const outcomes = { listOwned: async () => options.outcomes ?? [] } as unknown as DecisionOutcomeStore;
  const market = {
    highestCloseBetween: async () => (options.high === undefined ? null : options.high),
    quotes: async () =>
      new Map(options.price === undefined ? [] : [["BTC", { symbol: "BTC", currentPrice: options.price }]]),
  } as unknown as MarketProbe;
  return new PreviewTradeBehavior(portfolio, plans, outcomes, market, () => NOW);
};

const buy = { symbol: "btc", side: "buy" as const, quantity: new Decimal(1), price: new Decimal(100), hasPlan: false };

describe("PreviewTradeBehavior", () => {
  it("계획 없는 매수 + 계획 외 기대값 음수(표본 20) → 엣지 없음 한 줄", async () => {
    const losing = Array.from({ length: 20 }, (_, index) => outcome(index, -0.02));
    const result = await setup({ outcomes: losing }).execute("u1", buy);

    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.deepEqual(result.candidateTags, ["off_plan"]);
    assert.equal(result.chasingUnknown, true);
    assert.deepEqual(result.edgeWarnings.map((warning) => warning.tag), ["off_plan"]);
    assert.equal(result.sellFraming, null);
    // 진입 전 체크리스트(FR-30, 슬라이스 6) — 같은 태그 비용에서 자란 질문
    assert.deepEqual(result.checklist?.items.map((item) => item.tag), ["off_plan"]);
    assert.equal(result.checklist?.items[0].count, 20);
  });

  it("표본 19 면 후보여도 한 줄이 없다", async () => {
    const losing = Array.from({ length: 19 }, (_, index) => outcome(index, -0.02));
    const result = await setup({ outcomes: losing }).execute("u1", buy);
    assert.ok(result.status === "ok" && result.edgeWarnings.length === 0);
  });

  it("매도는 태그 대신 계획 손절 vs 지금", async () => {
    const result = await setup({
      ledger: [tx("b1", "buy", "2026-02-01T00:00:00Z", 100)],
      plans: [{ id: "p1", transactionId: "b1", side: "buy", stopPrice: new Decimal(90), createdAt: NOW }],
      price: 120,
    }).execute("u1", { ...buy, side: "sell" });

    assert.ok(result.status === "ok");
    if (result.status !== "ok") return;
    assert.deepEqual(result.candidateTags, []);
    assert.equal(result.checklist, null, "매도엔 진입 전 체크리스트가 없다");
    assert.equal(result.sellFraming?.stopPrice?.toNumber(), 90);
    assert.equal(result.sellFraming?.currentPrice?.toNumber(), 120);
  });

  it("거래가 상한에 잘리면 만들지 않는다", async () => {
    const result = await setup({ truncated: true }).execute("u1", buy);
    assert.deepEqual(result, { status: "truncated" });
  });
});

describe("CheckTradeSize × 미리보기", () => {
  const profiles = { findByUser: async () => null } as unknown as CoachProfileStore;
  const portfolio = {
    listHoldings: async () => [],
    listLedgerSince: async () => ({ entries: [], truncated: false }),
  } as unknown as PortfolioProbe;
  const market = { closeAtOrAfter: async () => null, quotes: async () => new Map() } as unknown as MarketProbe;
  const forecasts = { realizedVolatility: async () => null } as unknown as ForecastReader;
  const command = { symbol: "btc", side: "buy" as const, quantity: new Decimal(1), price: new Decimal(100) };

  it("미리보기가 실패해도 사이즈 결과는 나가고 behavior 만 null", async () => {
    const failing = {
      execute: async () => {
        throw new Error("boom");
      },
    } as unknown as PreviewTradeBehavior;
    const size = await new CheckTradeSize(profiles, portfolio, market, forecasts, () => NOW, failing).execute(
      "u1",
      command
    );
    assert.equal(size.behavior, null);
    assert.equal(size.orderExecution, false);
  });

  it("hasPlan 이 없으면 손절가 유무로 계획을 본다", async () => {
    const seen: boolean[] = [];
    const spy = {
      execute: async (_: string, input: { hasPlan: boolean }) => {
        seen.push(input.hasPlan);
        return { status: "truncated" as const };
      },
    } as unknown as PreviewTradeBehavior;
    const check = new CheckTradeSize(profiles, portfolio, market, forecasts, () => NOW, spy);
    await check.execute("u1", command);
    await check.execute("u1", { ...command, stopPrice: new Decimal(90) });
    await check.execute("u1", { ...command, hasPlan: true });
    assert.deepEqual(seen, [false, true, true]);
  });
});
