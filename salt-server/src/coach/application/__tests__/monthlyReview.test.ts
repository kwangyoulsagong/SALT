import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import type {
  CoachHolding,
  CoachLedgerEntry,
  CoachProfile,
  CoachProfileStore,
  DailyBar,
  DecisionOutcome,
  DecisionOutcomeStore,
  ForecastReader,
  MarketProbe,
  MonthlyReview,
  MonthlyReviewStore,
  PortfolioProbe,
  StoredMonthlyReview,
  TradePlan,
  TradePlanStore,
} from "../../domain";
import { BuildMonthlyReview, GetMonthlyReview } from "../ManageMonthlyReview";
import { GetRiskBudget, UpdateRiskBudget } from "../ManageRiskBudget";

/**
 * F009 슬라이스 6 유스케이스 (`SRV-REQ-038` FR-10) — 복기는 한 번 만들고 고치지 않는다 · 끝난 달만 · 시나리오가 게이지와 같은 보유에서.
 */

/** JSON 컬럼과 같은 왕복 — 저장 뒤 읽으면 Decimal · Date 가 문자열이다 */
class MemoryReviews implements MonthlyReviewStore {
  rows = new Map<string, StoredMonthlyReview>();
  saves = 0;
  async find(userId: string, month: string) {
    return this.rows.get(`${userId}:${month}`) ?? null;
  }
  async listMonths(userId: string) {
    return [...this.rows.keys()]
      .filter((key) => key.startsWith(`${userId}:`))
      .map((key) => key.slice(userId.length + 1))
      .sort()
      .reverse();
  }
  async saveIfAbsent(userId: string, review: MonthlyReview, generatedAt: Date) {
    this.saves += 1;
    const key = `${userId}:${review.month}`;
    const existing = this.rows.get(key);
    if (existing) return existing;
    const stored = { month: review.month, payload: JSON.parse(JSON.stringify(review)), generatedAt };
    this.rows.set(key, stored);
    return stored;
  }
}

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

const bar = (day: string, close: number): DailyBar => ({ openTime: new Date(`${day}T00:00:00Z`), close: new Decimal(close) });

const outcome = (netPnlKrw: number, tags: string[]): DecisionOutcome => ({
  id: "o1",
  userId: "u1",
  planId: null,
  closingTransactionId: "s1",
  symbol: "BTC",
  openedAt: new Date("2026-01-01T01:00:00Z"),
  closedAt: new Date("2026-01-03T01:00:00Z"),
  holdingDays: new Decimal(2),
  quantity: new Decimal(1),
  netPnlKrw: new Decimal(netPnlKrw),
  feesKrw: new Decimal(0),
  netReturn: new Decimal(netPnlKrw).div(100),
  rMultiple: null,
  benchmarkReturn: null,
  adherenceLabel: null,
  autoTags: tags,
  userTags: [],
  userTagsConfirmedAt: null,
  sampleOrigin: "live",
  computedAt: new Date("2026-01-04T00:00:00Z"),
});

const setup = (options: { ledger?: CoachLedgerEntry[]; truncated?: boolean; now?: string } = {}) => {
  const ledger = options.ledger ?? [tx("b1", "buy", "2026-01-01T01:00:00Z", 100), tx("s1", "sell", "2026-01-03T01:00:00Z", 90)];
  const state = { outcomes: [outcome(-10, ["chasing"])] };
  const portfolio = {
    async listLedgerSince() {
      return { entries: [...ledger].reverse(), truncated: options.truncated ?? false };
    },
  } as unknown as PortfolioProbe;
  const plans = {
    async listLinked() {
      return [] as TradePlan[];
    },
    async listForecasted() {
      return [] as TradePlan[];
    },
  } as unknown as TradePlanStore;
  const outcomes = {
    async listOwned() {
      return state.outcomes;
    },
  } as unknown as DecisionOutcomeStore;
  const forecasts = {
    async dailyCloses() {
      return new Map([["BTC", [bar("2026-01-01", 100), bar("2026-01-02", 95), bar("2026-01-03", 90)]]]);
    },
  } as unknown as ForecastReader;
  const profiles = { findByUser: async () => null } as unknown as CoachProfileStore;
  const reviews = new MemoryReviews();
  const now = () => new Date(options.now ?? "2026-02-02T00:00:00Z");
  const build = new BuildMonthlyReview(reviews, profiles, portfolio, plans, outcomes, forecasts, now);
  return { state, reviews, build, get: new GetMonthlyReview(reviews, build, now) };
};

describe("BuildMonthlyReview · GetMonthlyReview", () => {
  it("달을 주지 않으면 KST 지난달 · 만든 뒤에는 태그가 바뀌어도 그대로다(W06)", async () => {
    const ctx = setup();
    const first = await ctx.get.execute("u1");
    assert.equal(first.month, "2026-01");
    assert.equal(first.status, "ok");
    assert.equal(first.review?.payload.topMistake?.tag, "chasing");
    assert.equal(first.review?.payload.topMistake?.netPnlKrw, "-10", "저장 모양은 문자열");
    assert.deepEqual(first.availableMonths, ["2026-01"]);

    ctx.state.outcomes = [outcome(-10, ["off_plan"])];
    const again = await ctx.build.execute("u1", "2026-01");
    assert.equal(again.status, "ok");
    assert.equal(again.status === "ok" && again.created, false);
    assert.equal(again.status === "ok" && again.review.payload.topMistake?.tag, "chasing");
    assert.equal(ctx.reviews.saves, 1, "이미 있으면 계산 · 저장을 하지 않는다");
  });

  it("끝나지 않은 달은 만들지 않는다", async () => {
    const ctx = setup({ now: "2026-01-20T00:00:00Z" });
    const view = await ctx.get.execute("u1", "2026-01");
    assert.equal(view.status, "month_not_closed");
    assert.equal(view.review, null);
    assert.equal(ctx.reviews.saves, 0);
  });

  it("그달 말까지 거래가 없으면 no_ledger · 잘렸으면 truncated — 둘 다 저장하지 않는다", async () => {
    const later = setup({ ledger: [tx("b1", "buy", "2026-02-01T01:00:00Z", 100)] });
    assert.equal((await later.build.execute("u1", "2026-01")).status, "no_ledger");
    const truncated = setup({ truncated: true });
    assert.equal((await truncated.build.execute("u1", "2026-01")).status, "truncated");
    assert.equal(later.reviews.saves + truncated.reviews.saves, 0);
  });
});

describe("GetRiskBudget — 시나리오 · 한 종목 상한", () => {
  const now = new Date("2026-09-24T03:00:00Z");
  const holdings = [
    { symbol: "btc", totalQuantity: 0.01, currentValue: 700_000 } as CoachHolding,
    { symbol: "ETH", totalQuantity: 1, currentValue: 300_000 } as CoachHolding,
  ];
  const portfolio = {
    listHoldings: async () => holdings,
    listLedgerSince: async () => ({ entries: [], truncated: false }),
  } as unknown as PortfolioProbe;
  const market = { closeAtOrAfter: async () => 70_000_000 } as unknown as MarketProbe;
  const requested: string[][] = [];
  const forecasts = {
    async dailyCloses(symbols: string[]) {
      requested.push(symbols);
      throw new Error("forecast down");
    },
    // ETH 는 베타가 없다(이력 부족) — 합에서 빠지고 coveredWeight 로 알린다
    async symbolRisk() {
      return new Map([
        ["BTC", { annualized: 0.5, ewma: 0.5, btcBeta: 1, asOf: now }],
        ["ETH", { annualized: 0.7, ewma: 0.7, btcBeta: null, asOf: now }],
      ]);
    },
    async marketRegime() {
      throw new Error("regime down");
    },
  } as unknown as ForecastReader;

  it("시나리오는 게이지와 같은 보유에서 · 과거 구간 일봉이 실패해도 게이지는 나간다", async () => {
    const profiles = { findByUser: async () => null } as unknown as CoachProfileStore;
    const view = await new GetRiskBudget(profiles, portfolio, market, forecasts, () => now).execute("u1");
    assert.deepEqual(requested, [["BTC", "ETH"]], "종목은 대문자로");
    assert.equal(view.scenarios.status, "ok");
    assert.equal(view.scenarios.totalValue.toKrwInteger(), view.totalValue.toKrwInteger());
    assert.equal(view.scenarios.shocks[1].loss.toKrwInteger(), -300_000);
    assert.equal(view.scenarios.episodes[0].status, "insufficient_data");
    assert.equal(view.gauges.concentration.topWeight?.toNumber(), 0.7);
    assert.equal(view.settings.maxSingleAssetWeight.toNumber(), 0.6, "기본 60%");
    // BTC 베타 합(F010 슬라이스 2) — 700,000 × 1 / 1,000,000. ETH 는 모름
    assert.equal(view.gauges.btcBeta.betaSum?.toNumber(), 0.7);
    assert.equal(view.gauges.btcBeta.coveredWeight?.toNumber(), 0.7);
    assert.deepEqual(view.gauges.btcBeta.missingSymbols, ["ETH"]);
    assert.equal(view.market, null, "국면 읽기가 실패해도 게이지는 나간다");
  });

  it("한 종목 상한을 바꾸고 null 이면 기본으로 되돌린다", async () => {
    const saved: Array<Partial<CoachProfile>> = [];
    const profiles = {
      findByUser: async () => null,
      upsert: async (_userId: string, patch: Partial<CoachProfile>) => {
        saved.push(patch);
        return {} as CoachProfile;
      },
    } as unknown as CoachProfileStore;
    const get = new GetRiskBudget(profiles, portfolio, market, forecasts, () => now);
    const update = new UpdateRiskBudget(profiles, get);
    await update.execute("u1", { maxSingleAssetWeight: new Decimal("0.4") });
    await update.execute("u1", { maxSingleAssetWeight: null });
    await update.execute("u1", { targetVolatility: new Decimal("0.2") });
    assert.deepEqual(saved, [{ maxSingleAssetWeight: 0.4 }, { maxSingleAssetWeight: 0.6 }, { targetVolatility: new Decimal("0.2") }]);
  });
});
