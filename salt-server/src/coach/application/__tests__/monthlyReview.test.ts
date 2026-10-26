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
  OutcomeAssetType,
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
  async find(userId: string, month: string, assetType: OutcomeAssetType = "crypto") {
    return this.rows.get(`${userId}:${assetType}:${month}`) ?? null;
  }
  async listMonths(userId: string, _limit: number, assetType: OutcomeAssetType = "crypto") {
    const prefix = `${userId}:${assetType}:`;
    return [...this.rows.keys()]
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
      .sort()
      .reverse();
  }
  async saveIfAbsent(userId: string, review: MonthlyReview, generatedAt: Date, assetType: OutcomeAssetType = "crypto") {
    this.saves += 1;
    const key = `${userId}:${assetType}:${review.month}`;
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
  const market = { quotes: async () => new Map() } as unknown as MarketProbe;
  const build = new BuildMonthlyReview(reviews, profiles, portfolio, plans, outcomes, forecasts, market, now);
  return { state, reviews, build, get: new GetMonthlyReview(reviews, build, [], null, now) };
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

describe("월간 복기 국내판 (F011 FR-48)", () => {
  // 화면은 지난 날짜를 00:00 KST(= 전날 15:00 UTC)로 저장한다
  const krTx = (id: string, side: "buy" | "sell", kstDay: string, price: number): CoachLedgerEntry => ({
    id,
    symbol: "005930",
    side,
    quantity: 1,
    price,
    totalAmount: price,
    fee: 0,
    transactionDate: new Date(new Date(`${kstDay}T00:00:00Z`).getTime() - 9 * 3600_000),
  });
  // 국내 일봉 openTime = KST 날짜 00:00 UTC. 2026-01-02(금) · 05(월) · 06(화) — 주말 3 · 4 일은 봉이 없다
  const krBars = [bar("2025-12-30", 100), bar("2026-01-02", 100), bar("2026-01-05", 80), bar("2026-01-06", 90)];
  const forecastPlan = (id: string, symbol: string): TradePlan =>
    ({
      id,
      symbol,
      probabilityUp: new Decimal("0.8"),
      plannedAt: new Date("2026-01-01T15:00:00Z"), // 01-02 00:00 KST
      reviewAt: new Date("2026-01-05T15:00:00Z"), // 01-06 00:00 KST — 01-05 종가가 결과
      sampleOrigin: "live",
    }) as TradePlan;

  const setupKr = () => {
    const calls: Array<{ assetTypes?: string[]; outcomesAssetType?: string }> = [];
    const krOutcome = {
      ...outcome(-10, ["averaging_down"]),
      symbol: "005930",
      closingTransactionId: "s1",
      // 01-06 00:00 KST 매도의 실제 시각 — 벽시계로 옮겨야 1월 안이다
      closedAt: new Date("2026-01-05T15:00:00Z"),
    };
    const portfolio = {
      async listLedgerSince(_userId: string, _since: Date, _limit: number, assetTypes?: string[]) {
        calls.push({ assetTypes });
        const kr = [krTx("b1", "buy", "2026-01-02", 100), krTx("s1", "sell", "2026-01-06", 90)];
        return { entries: assetTypes?.includes("kr_stock") ? [...kr].reverse() : [], truncated: false };
      },
    } as unknown as PortfolioProbe;
    const plans = {
      listLinked: async () => [] as TradePlan[],
      listForecasted: async () => [forecastPlan("p-kr", "005930"), forecastPlan("p-btc", "BTC")],
    } as unknown as TradePlanStore;
    const outcomes = {
      async listOwned(_userId: string, _limit: number, assetType?: string) {
        calls.push({ outcomesAssetType: assetType });
        return assetType === "kr_stock" ? [krOutcome] : [];
      },
    } as unknown as DecisionOutcomeStore;
    const forecasts = {
      async dailyCloses(symbols: string[]) {
        return new Map(symbols.map((symbol) => [symbol, symbol === "005930" ? krBars : [bar("2026-01-01", 1)]]));
      },
    } as unknown as ForecastReader;
    const market = {
      quotes: async (symbols: string[]) =>
        new Map(symbols.map((symbol) => [symbol, { symbol, assetType: symbol === "005930" ? "kr_stock" : "crypto" }])),
    } as unknown as MarketProbe;
    const profiles = { findByUser: async () => null } as unknown as CoachProfileStore;
    const reviews = new MemoryReviews();
    const now = () => new Date("2026-02-02T00:00:00Z");
    const build = new BuildMonthlyReview(reviews, profiles, portfolio, plans, outcomes, forecasts, market, now);
    const labels = { assetLabels: async () => [{ symbol: "005930", name: "삼성전자", logoUrl: null }] };
    return { calls, reviews, build, get: new GetMonthlyReview(reviews, build, ["owner@salt.dev"], labels, now) };
  };

  it("소유자가 아니면 404 오류 — 만들지도 않는다", async () => {
    const ctx = setupKr();
    await assert.rejects(
      ctx.get.execute("u1", "2026-01", { assetType: "kr_stock", viewerEmail: "guest@salt.dev" }),
      { name: "KrStockJudgmentNotAvailableError" }
    );
    assert.equal(ctx.reviews.saves, 0);
  });

  it("국내 거래 · 결과 · 계획만 · 코인판과 따로 저장 · 날은 거래일 · 보유는 거래일", async () => {
    const ctx = setupKr();
    const view = await ctx.get.execute("u1", "2026-01", { assetType: "kr_stock", viewerEmail: "owner@salt.dev" });
    assert.equal(view.assetType, "kr_stock");
    assert.equal(view.status, "ok");
    assert.deepEqual(ctx.calls.slice(0, 2), [{ assetTypes: ["kr_stock"] }, { outcomesAssetType: "kr_stock" }]);
    const review = view.review!.payload;
    assert.deepEqual(review.activity, { tradeCount: 2, buyCount: 1, sellCount: 1, closedCount: 1 });
    assert.equal(review.topMistake?.tag, "averaging_down");
    // 01-02 · 05 · 06 세 거래일(주말 3 · 4 일은 날이 아니다)
    assert.equal(review.ipsDeviation.observedDays, 3);
    // 금요일 매수 → 화요일 매도 = 2거래일(달력으로는 4일)
    assert.equal(review.disposition.lossHoldingDays.value, "2");
    // 국내 계획만 채점 — 01-02 직전 닫힌 종가 100(12-30) → 01-05 종가 80, 0.8 이라 했는데 내려갔다
    assert.equal(review.brier.meanScore.sampleSize, 1);
    assert.equal(review.brier.recentMisses[0].symbol, "005930");
    assert.equal(review.brier.recentMisses[0].plannedAt, "2026-01-01T15:00:00.000Z", "저장 시각은 실제 시각");
    assert.equal(review.from, "2025-12-31T15:00:00.000Z");
    assert.deepEqual(await ctx.reviews.listMonths("u1", 12, "crypto"), [], "코인판과 섞이지 않는다");
    assert.deepEqual(view.availableMonths, ["2026-01"]);
    assert.deepEqual(view.symbolNames, { "005930": "삼성전자" }, "빗나간 예측 종목 이름은 읽을 때 붙인다");
  });

  it("코인판은 국내 계획을 채점하지 않는다", async () => {
    const ctx = setupKr();
    const crypto = await ctx.build.execute("u1", "2026-01");
    // 코인 거래가 없으면 만들지 않는다 — 국내 거래가 코인판 재료가 되지 않는다
    assert.equal(crypto.status, "no_ledger");
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
    assert.deepEqual(requested, [["BTC", "ETH"], ["BTC", "ETH"]], "종목은 대문자로 — 시나리오 구간 · 합산 변동성 창(F011 FR-46)");
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
    assert.equal(view.gauges.portfolioVolatility.status, "insufficient_data", "일봉이 없으면 그 칸만 비운다");
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
