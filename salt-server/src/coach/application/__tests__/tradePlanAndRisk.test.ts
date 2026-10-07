import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { ErrorKind, Money } from "../../../shared/domain";
import type {
  CoachHolding,
  CoachLedgerEntry,
  CoachProfile,
  CoachProfileStore,
  ForecastReader,
  MarketProbe,
  PortfolioProbe,
  TradePlan,
  TradePlanDraft,
  TradePlanPatch,
  TradePlanStore,
} from "../../domain";
import { CheckTradeSize } from "../CheckTradeSize";
import { GetRiskBudget } from "../ManageRiskBudget";
import { GetTargetWeights } from "../GetTargetWeights";
import { CreateTradePlan, UpdateTradePlan } from "../ManageTradePlan";
import { kstPeriodStarts } from "../lib/loadRiskSnapshot";

/**
 * F009 슬라이스 1 유스케이스 (`SRV-REQ-038`) — 계획 연결 · 잠금 · 경합, 두 화면의 같은 월 잔여, KST 월 경계.
 */

class MemoryPlans implements TradePlanStore {
  rows = new Map<string, TradePlan>();
  /** 다음 update 직전에 한 번 끼어든다 — 경합 재현용 */
  beforeNextUpdate: (() => void) | null = null;
  private seq = 0;

  async listForecasted(userId: string) {
    return [...this.rows.values()].filter((row) => row.userId === userId && row.probabilityUp !== null);
  }

  async create(draft: TradePlanDraft) {
    const plan: TradePlan = {
      ...draft,
      id: `p${++this.seq}`,
      adherenceLabel: null,
      adherenceEvaluatedAt: null,
      userAdherenceLabel: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.set(plan.id, plan);
    return plan;
  }

  async findOwned(userId: string, planId: string) {
    const plan = this.rows.get(planId);
    return plan && plan.userId === userId ? plan : null;
  }

  async listOwned() {
    return [...this.rows.values()];
  }

  async update(userId: string, planId: string, patch: TradePlanPatch, guard: { requireUnlinked: boolean }) {
    this.beforeNextUpdate?.();
    this.beforeNextUpdate = null;
    const plan = await this.findOwned(userId, planId);
    if (!plan || (guard.requireUnlinked && plan.transactionId !== null)) return null;
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const next = { ...plan, ...defined, updatedAt: new Date() } as TradePlan;
    this.rows.set(planId, next);
    return next;
  }
}

const entry = (overrides: Partial<CoachLedgerEntry>): CoachLedgerEntry => ({
  id: "tx1",
  symbol: "BTC",
  side: "buy",
  quantity: 0.01,
  price: 100_000_000,
  totalAmount: 1_000_000,
  fee: 500,
  transactionDate: new Date("2026-09-20T00:00:00Z"),
  ...overrides,
});

const portfolioWith = (options: {
  entries?: Record<string, { userId: string; entry: CoachLedgerEntry }>;
  holdings?: CoachHolding[];
  ledger?: CoachLedgerEntry[];
}): PortfolioProbe =>
  ({
    async findLedgerEntry(userId: string, id: string) {
      const found = options.entries?.[id];
      return found && found.userId === userId ? found.entry : null;
    },
    async listHoldings() {
      return options.holdings ?? [];
    },
    async listLedgerSince() {
      return { entries: options.ledger ?? [], truncated: false };
    },
  }) as unknown as PortfolioProbe;

const isDomainError = (code: string, kind: ErrorKind) => (error: unknown) =>
  (error as { code?: string }).code === code && (error as { kind?: ErrorKind }).kind === kind;

describe("CreateTradePlan", () => {
  const portfolio = portfolioWith({
    entries: {
      tx1: { userId: "u1", entry: entry({}) },
      txOther: { userId: "u2", entry: entry({ id: "txOther" }) },
    },
  });

  it("모든 선택 필드를 비워도 저장된다 — live 표본, 종목은 대문자", async () => {
    const plans = new MemoryPlans();
    const plan = await new CreateTradePlan(plans, portfolio).execute("u1", { symbol: "btc", side: "buy" });
    assert.equal(plan.symbol, "BTC");
    assert.equal(plan.stopPrice, null);
    assert.equal(plan.sampleOrigin, "live");
  });

  it("남의 거래에는 연결할 수 없다 — 없는 것과 같은 404", async () => {
    await assert.rejects(
      new CreateTradePlan(new MemoryPlans(), portfolio).execute("u1", {
        symbol: "BTC",
        side: "buy",
        transactionId: "txOther",
      }),
      isDomainError("COACH_TRADE_PLAN_TRANSACTION_NOT_FOUND", ErrorKind.NotFound)
    );
  });

  it("종목 · 방향이 다른 거래에는 연결할 수 없다", async () => {
    const create = new CreateTradePlan(new MemoryPlans(), portfolio);
    await assert.rejects(
      create.execute("u1", { symbol: "ETH", side: "buy", transactionId: "tx1" }),
      isDomainError("COACH_TRADE_PLAN_TRANSACTION_SYMBOL", ErrorKind.Invalid)
    );
    await assert.rejects(
      create.execute("u1", { symbol: "BTC", side: "sell", transactionId: "tx1" }),
      isDomainError("COACH_TRADE_PLAN_TRANSACTION_SIDE", ErrorKind.Invalid)
    );
  });
});

describe("UpdateTradePlan — 연결 뒤 채점 기준 잠금", () => {
  const portfolio = portfolioWith({
    entries: {
      tx1: { userId: "u1", entry: entry({}) },
      tx2: { userId: "u1", entry: entry({ id: "tx2" }) },
    },
  });

  const setup = async () => {
    const plans = new MemoryPlans();
    const plan = await new CreateTradePlan(plans, portfolio).execute("u1", {
      symbol: "BTC",
      side: "buy",
      stopPrice: new Decimal(92_000_000),
    });
    return { plans, plan, update: new UpdateTradePlan(plans, portfolio) };
  };

  it("연결 전에는 손절가를 옮길 수 있고, 연결 뒤에는 409", async () => {
    const { plan, update } = await setup();
    await update.execute("u1", plan.id, { stopPrice: new Decimal(90_000_000) });
    await update.execute("u1", plan.id, { transactionId: "tx1" });
    await assert.rejects(
      update.execute("u1", plan.id, { stopPrice: new Decimal(85_000_000) }),
      isDomainError("COACH_TRADE_PLAN_LOCKED", ErrorKind.Conflict)
    );
  });

  it("연결 뒤에도 이유 · 무효화 조건은 고칠 수 있다", async () => {
    const { plan, update } = await setup();
    await update.execute("u1", plan.id, { transactionId: "tx1" });
    const updated = await update.execute("u1", plan.id, { thesis: "지지선 확인 후 진입" });
    assert.equal(updated.thesis, "지지선 확인 후 진입");
  });

  it("거래 연결은 한 번뿐이다", async () => {
    const { plan, update } = await setup();
    await update.execute("u1", plan.id, { transactionId: "tx1" });
    await assert.rejects(
      update.execute("u1", plan.id, { transactionId: "tx2" }),
      isDomainError("COACH_TRADE_PLAN_ALREADY_LINKED", ErrorKind.Conflict)
    );
  });

  it("남의 계획은 없다(404)", async () => {
    const { plan, update } = await setup();
    await assert.rejects(
      update.execute("u2", plan.id, { thesis: "x" }),
      isDomainError("COACH_TRADE_PLAN_NOT_FOUND", ErrorKind.NotFound)
    );
  });

  it("검사 뒤 · 쓰기 전에 다른 요청이 연결하면 손절가 변경이 잠김으로 거절된다", async () => {
    const { plans, plan, update } = await setup();
    plans.beforeNextUpdate = () => {
      plans.rows.set(plan.id, { ...plans.rows.get(plan.id)!, transactionId: "tx1" });
    };
    await assert.rejects(
      update.execute("u1", plan.id, { stopPrice: new Decimal(80_000_000) }),
      isDomainError("COACH_TRADE_PLAN_LOCKED", ErrorKind.Conflict)
    );
    assert.equal(plans.rows.get(plan.id)!.stopPrice?.toNumber(), 92_000_000);
  });
});

describe("kstPeriodStarts — 월 경계는 KST", () => {
  it("UTC 9월 30일 16시 = KST 10월 1일 01시 → 월초는 10월 1일 00시 KST", () => {
    const { monthStart, yearStart } = kstPeriodStarts(new Date("2026-09-30T16:00:00Z"));
    assert.equal(monthStart.toISOString(), "2026-09-30T15:00:00.000Z");
    assert.equal(yearStart.toISOString(), "2025-12-31T15:00:00.000Z");
  });
});

describe("CheckTradeSize · GetRiskBudget — 같은 스냅샷", () => {
  const now = new Date("2026-09-24T03:00:00Z");
  const profile: CoachProfile = {
    userId: "u1",
    riskTolerance: "medium",
    maxSingleAssetWeight: 0.6,
    rebalanceBand: 0.1,
    panicSellWindowHours: 24,
    defaultMode: null,
    notificationLevel: null,
    monthlyLossBudget: { amount: new Decimal(1_000_000), unit: "krw" },
    perTradeMaxLoss: { amount: new Decimal("0.01"), unit: "percent" },
    targetVolatility: null,
    investableCapital: null,
    hidePurchasePrice: false,
  };
  const profiles = { findByUser: async () => profile } as unknown as CoachProfileStore;
  // 이번 달 거래 없음. 월초 BTC 0.1 × 100M + ETH 1 × 1M = 11,000,000 → 지금 9,200,000 + 800,000 = 10,000,000
  const holdings = [
    { symbol: "BTC", totalQuantity: 0.1, currentValue: 9_200_000 } as CoachHolding,
    { symbol: "ETH", totalQuantity: 1, currentValue: 800_000 } as CoachHolding,
  ];
  const market = {
    closeAtOrAfter: async (symbol: string) => (symbol === "BTC" ? 100_000_000 : 1_000_000),
  } as unknown as MarketProbe;
  // 시나리오의 과거 구간 일봉 — 이 스위트는 게이지만 본다
  const forecasts = {
    realizedVolatility: async () => null,
    dailyCloses: async () => new Map(),
    symbolRisk: async () => new Map(),
    marketRegime: async () => null,
  } as unknown as ForecastReader;
  const portfolio = portfolioWith({ holdings, ledger: [] });

  it("월 손익 −1,000,000 → 게이지 100% · 사이즈 계산은 예산 소진", async () => {
    const budget = await new GetRiskBudget(profiles, portfolio, market, forecasts, () => now).execute("u1");
    assert.equal(budget.gauges.drawdown.monthPnl?.toKrwInteger(), -1_000_000);
    assert.equal(budget.gauges.drawdown.usedRatio?.toNumber(), 1);
    // 1회 예산 1% × 10,000,000 = 100,000
    assert.equal(budget.settings.perTradeMaxLossKrw?.toKrwInteger(), 100_000);
    assert.equal(budget.settings.targetVolatilityIsDefault, true);

    const size = await new CheckTradeSize(profiles, portfolio, market, forecasts, () => now).execute("u1", {
      symbol: "btc",
      side: "buy",
      quantity: new Decimal("0.001"),
      price: new Decimal(92_000_000),
      stopPrice: new Decimal(88_000_000),
    });
    assert.equal(size.sizing.monthlyBudgetRemaining?.toKrwInteger(), 0);
    assert.equal(size.sizing.unavailable.monthlyBudgetRemainingRatio, "monthly_budget_exhausted");
    assert.equal(size.sizing.unavailable.volTargetWeight, "insufficient_data");
    assert.equal(size.sizing.currentWeight?.toNumber(), 0.92);
    assert.equal(size.orderExecution, false);
  });
});

describe("GetTargetWeights — 게이지와 같은 월 잔여 · 3종 고지", () => {
  const now = new Date("2026-09-30T03:00:00Z");
  const profile: CoachProfile = {
    userId: "u1",
    riskTolerance: "medium",
    maxSingleAssetWeight: 0.6,
    rebalanceBand: 0.1,
    panicSellWindowHours: 24,
    defaultMode: null,
    notificationLevel: null,
    monthlyLossBudget: { amount: new Decimal(1_000_000), unit: "krw" },
    perTradeMaxLoss: null,
    targetVolatility: new Decimal("0.2"),
    investableCapital: Money.krw(20_000_000),
    hidePurchasePrice: false,
  };
  const profiles = { findByUser: async () => profile } as unknown as CoachProfileStore;
  // 월초 11,000,000 → 지금 10,000,000 · 이번 달 거래 없음 → 월 손익 −1,000,000 (예산 소진)
  const holdings = [
    { symbol: "BTC", totalQuantity: 0.1, currentValue: 9_200_000, currentPrice: 92_000_000 } as CoachHolding,
    { symbol: "SOL", totalQuantity: 4, currentValue: 800_000, currentPrice: 200_000 } as CoachHolding,
  ];
  const market = {
    closeAtOrAfter: async (symbol: string) => (symbol === "BTC" ? 100_000_000 : 250_000),
    // ETH 는 보유가 없어 시세로만 값이 온다. SOL 시세가 없으면 보유 현재가를 쓴다
    quotes: async () => new Map([["ETH", { symbol: "ETH", currentPrice: 5_000_000 }]]),
  } as unknown as MarketProbe;
  const riskRows = new Map([
    ["BTC", { annualized: 0.5, ewma: 0.5, btcBeta: 1, asOf: now }],
    // ETH 는 QLIKE 게이트에 막혀 annualized 가 없어도 EWMA 로 들어간다(사전등록 정의)
    ["ETH", { annualized: null, ewma: 0.7, btcBeta: 1.1, asOf: now }],
    ["SOL", { annualized: null, ewma: null, btcBeta: null, asOf: now }],
  ]);
  const forecasts = { symbolRisk: async () => riskRows, targetWeightLive: async () => null } as unknown as ForecastReader;
  const portfolio = portfolioWith({ holdings, ledger: [] });
  const liveRow = (nWeeks: number) => ({
    target: 0.2, asOf: now, firstRebalanceAt: new Date("2026-10-05T00:00:00Z"), nWeeks, nExcluded: 0,
    cumReturn: 0.05, btcCumReturn: 0.1, mdd: 0.08, btcMdd: 0.2, vol: 0.21, upside: 0.4, downside: 0.35, worstWeeks: [],
  });

  it("σ 없는 보유는 빠지고, 과거 성적은 가장 가까운 목표 σ 기록", async () => {
    const view = await new GetTargetWeights(profiles, portfolio, market, forecasts, () => now).execute("u1");
    assert.equal(view.renderable, true);
    assert.equal(view.guide.basis, "investable_capital");
    assert.deepEqual(view.guide.rows.map((row) => row.symbol), ["BTC", "ETH"]);
    // SOL 은 σ 도 없지만 먼저 알트다 — target-weight@2 채택 없음 → no_record
    assert.deepEqual(view.guide.excluded.map((row) => [row.symbol, row.reason]), [["SOL", "no_record"]]);
    assert.equal(view.altShare.adopted, null);
    assert.equal(view.live, null);
    assert.equal(view.recordSource, "backtest");
    // 목표 σ 0.2 · 두 종목 → BTC 0.2 / (2 × 0.5) = 0.2 → 4,000,000 원
    assert.equal(view.guide.rows[0].targetValue.toKrwInteger(), 4_000_000);
    assert.equal(view.guide.rows[1].price.toKrwInteger(), 5_000_000);
    assert.equal(view.record.target, 0.2);
    // 월 예산 소진 → 남은 예산 0 → 비율 없음
    assert.equal(view.guide.totals.lossAtStopMonthlyBudgetRatio, null);
    assert.equal(view.orderExecution, false);
  });

  it("라이브 원장이 30주 쌓이기 전에는 백테스트, 쌓이면 라이브를 과거 성적 자리에", async () => {
    for (const [weeks, source] of [[29, "backtest"], [30, "live"]] as const) {
      let asked: number | null = null;
      const reader = {
        symbolRisk: async () => riskRows,
        targetWeightLive: async (target: number) => ((asked = target), liveRow(weeks)),
      } as unknown as ForecastReader;
      const view = await new GetTargetWeights(profiles, portfolio, market, reader, () => now).execute("u1");
      assert.equal(asked, 0.2); // 사용자 목표 σ 에 가장 가까운 등록 목표
      assert.equal(view.live?.nWeeks, weeks);
      assert.equal(view.recordSource, source);
    }
  });

  it("σ 가 하나도 없으면 비중을 내지 않는다", async () => {
    const none = {
      symbolRisk: async () => new Map(),
      targetWeightLive: async () => null,
      volatilityAsOf: async () => null,
    } as unknown as ForecastReader;
    const view = await new GetTargetWeights(profiles, portfolio, market, none, () => now).execute("u1");
    assert.equal(view.renderable, false);
    assert.equal(view.blockedReason, "no_volatility");
  });

  it("멈춘 시세는 쓰지 않고, 비중이 하나도 안 나오면 stale_inputs (F010 슬라이스 7 · FR-195 · 196)", async () => {
    const forecasts = {
      symbolRisk: async () => riskRows,
      targetWeightLive: async () => null,
      volatilityAsOf: async () => now,
    } as unknown as ForecastReader;
    const hourAgo = new Date(now.getTime() - 3_600_000);
    const staleMarket = {
      ...market,
      quotes: async () =>
        new Map([
          ["BTC", { symbol: "BTC", currentPrice: 92_000_000, priceUpdatedAt: hourAgo }],
          ["ETH", { symbol: "ETH", currentPrice: 5_000_000, priceUpdatedAt: hourAgo }],
        ]),
    } as unknown as MarketProbe;
    const view = await new GetTargetWeights(profiles, portfolio, staleMarket, forecasts, () => now).execute("u1");
    assert.equal(view.renderable, false);
    assert.equal(view.blockedReason, "stale_inputs");
    assert.ok(view.guide.excluded.some((row) => row.symbol === "BTC" && row.reason === "price_unavailable"));

    // 변동성 배치가 사흘 넘게 멈췄다 — σ 가 3일 필터에 다 걸려 맵이 비었다
    const stopped = {
      symbolRisk: async () => new Map(),
      targetWeightLive: async () => null,
      volatilityAsOf: async () => new Date(now.getTime() - 4 * 86_400_000),
    } as unknown as ForecastReader;
    const halted = await new GetTargetWeights(profiles, portfolio, market, stopped, () => now).execute("u1");
    assert.equal(halted.blockedReason, "stale_inputs");
  });
});
