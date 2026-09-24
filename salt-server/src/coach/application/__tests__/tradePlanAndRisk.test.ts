import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { ErrorKind } from "../../../shared/domain";
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
  const forecasts = { realizedVolatility: async () => null } as unknown as ForecastReader;
  const portfolio = portfolioWith({ holdings, ledger: [] });

  it("월 손익 −1,000,000 → 게이지 100% · 사이즈 계산은 예산 소진", async () => {
    const budget = await new GetRiskBudget(profiles, portfolio, market, () => now).execute("u1");
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
