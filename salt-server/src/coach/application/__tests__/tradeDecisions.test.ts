import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { ErrorKind } from "../../../shared/domain";
import type {
  AdherenceLabel,
  CoachLedgerEntry,
  DailyBar,
  DecisionOutcome,
  DecisionOutcomeDraft,
  DecisionOutcomeStore,
  ForecastReader,
  MarketProbe,
  OutcomeAssetType,
  PortfolioProbe,
  TradePlan,
  TradePlanStore,
} from "../../domain";
import { EvaluateTradeDecisions } from "../EvaluateTradeDecisions";
import { GetBehaviorMirror } from "../GetBehaviorMirror";
import { ConfirmOutcomeTags } from "../ManageDecisionOutcomes";

/**
 * F009 슬라이스 4 유스케이스 (`SRV-REQ-038` FR-9) — 배치 멱등 · 사용자 수정 보존 · 지운 매도 정리 · 잘린 거래.
 */

class MemoryOutcomes implements DecisionOutcomeStore {
  rows = new Map<string, DecisionOutcome>();
  /** 청산 거래 id → 자산군(실제 저장소는 거래 표에서 읽는다) */
  assetOf = new Map<string, OutcomeAssetType>();
  private seq = 0;

  async replaceForUser(userId: string, drafts: DecisionOutcomeDraft[], computedAt: Date, assetType: OutcomeAssetType = "crypto") {
    const keep = new Set(drafts.map((draft) => draft.closingTransactionId));
    let removed = 0;
    for (const draft of drafts) this.assetOf.set(draft.closingTransactionId, assetType);
    for (const [key, row] of this.rows) {
      if (row.userId === userId && (this.assetOf.get(key) ?? "crypto") === assetType && !keep.has(key)) {
        this.rows.delete(key);
        removed += 1;
      }
    }
    for (const draft of drafts) {
      const existing = this.rows.get(draft.closingTransactionId);
      this.rows.set(draft.closingTransactionId, {
        ...draft,
        id: existing?.id ?? `o${++this.seq}`,
        userTags: existing?.userTags ?? [],
        userTagsConfirmedAt: existing?.userTagsConfirmedAt ?? null,
        computedAt,
      });
    }
    return { written: drafts.length, removed };
  }

  async listOwned(userId: string, _limit?: number, assetType: OutcomeAssetType = "crypto") {
    return [...this.rows.values()].filter(
      (row) => row.userId === userId && (this.assetOf.get(row.closingTransactionId) ?? "crypto") === assetType
    );
  }

  async confirmTags(userId: string, outcomeId: string, tags: string[], confirmedAt: Date) {
    const row = [...this.rows.values()].find((candidate) => candidate.id === outcomeId && candidate.userId === userId);
    if (!row) return null;
    row.userTags = tags;
    row.userTagsConfirmedAt = confirmedAt;
    return row;
  }
}

class MemoryPlans {
  constructor(public rows: TradePlan[]) {}
  async listForecasted(userId: string) {
    return this.rows.filter((plan) => plan.userId === userId && plan.probabilityUp !== null);
  }
  async listLinked(userId: string) {
    return this.rows.filter((plan) => plan.userId === userId && plan.transactionId !== null);
  }
  async saveAdherence(userId: string, judgements: Array<{ planId: string; label: AdherenceLabel | null }>, at: Date) {
    for (const { planId, label } of judgements) {
      const plan = this.rows.find((row) => row.id === planId && row.userId === userId);
      if (plan) Object.assign(plan, { adherenceLabel: label, adherenceEvaluatedAt: at });
    }
  }
}

const tx = (id: string, side: "buy" | "sell", iso: string, price: number, fee = 0): CoachLedgerEntry => ({
  id,
  symbol: "BTC",
  side,
  quantity: 1,
  price,
  totalAmount: price,
  fee,
  transactionDate: new Date(iso),
});

const plan = (overrides: Partial<TradePlan>): TradePlan => ({
  id: "p1",
  userId: "u1",
  transactionId: "b1",
  symbol: "BTC",
  side: "buy",
  stopPrice: new Decimal(90),
  targetPrice: null,
  plannedQuantity: null,
  thesis: null,
  invalidation: null,
  reviewAt: null,
  probabilityUp: null,
  checklist: null,
  plannedAt: new Date("2026-01-01T00:00:00Z"),
  sampleOrigin: "live",
  adherenceLabel: null,
  adherenceEvaluatedAt: null,
  userAdherenceLabel: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

const setup = (options: {
  ledger: CoachLedgerEntry[];
  krLedger?: CoachLedgerEntry[];
  truncated?: boolean;
  plans?: TradePlan[];
  krBars?: DailyBar[];
}) => {
  const state = { ledger: options.ledger, krLedger: options.krLedger ?? [] };
  const portfolio = {
    // 실제 어댑터처럼 자산군을 지킨다 — 국내 회차가 코인 거래를 다시 세지 않는다
    async listLedgerSince(_userId: string, _since: Date, _limit: number, assetTypes: readonly string[] = ["crypto"]) {
      const entries = assetTypes.includes("kr_stock") ? state.krLedger : state.ledger;
      return { entries: [...entries].reverse(), truncated: options.truncated ?? false };
    },
    async listHoldings() {
      return [];
    },
  } as unknown as PortfolioProbe;
  const bars: DailyBar[] = [
    { openTime: new Date("2026-01-01T00:00:00Z"), close: new Decimal(100) },
    { openTime: new Date("2026-01-02T00:00:00Z"), close: new Decimal(85) },
  ];
  const forecasts = {
    async dailyCloses(symbols: string[]) {
      return new Map([
        ["BTC", bars],
        ["005930", options.krBars ?? []],
      ].filter(([symbol]) => symbols.includes(symbol as string)) as Array<[string, DailyBar[]]>);
    },
  } as unknown as ForecastReader;
  const market = {
    async highestCloseBetween() {
      return null;
    },
  } as unknown as MarketProbe;
  const plans = new MemoryPlans(options.plans ?? []);
  const outcomes = new MemoryOutcomes();
  const now = () => new Date("2026-02-01T00:00:00Z");
  return {
    state,
    plans,
    outcomes,
    evaluate: new EvaluateTradeDecisions(
      portfolio,
      plans as unknown as TradePlanStore,
      outcomes,
      forecasts,
      market,
      now
    ),
    mirror: new GetBehaviorMirror(portfolio, plans as unknown as TradePlanStore, outcomes, forecasts, now),
  };
};

describe("EvaluateTradeDecisions", () => {
  it("계획 판정 → 결과가 그 라벨을 싣는다 · 두 번 돌려도 같다", async () => {
    const ctx = setup({
      ledger: [tx("b1", "buy", "2026-01-01T01:00:00Z", 100), tx("s1", "sell", "2026-01-05T01:00:00Z", 88)],
      plans: [plan({})],
    });
    const first = await ctx.evaluate.execute("u1");
    assert.equal(first.status, "ok");
    assert.equal(first.labels.stop_not_honored, 1);
    assert.equal(ctx.plans.rows[0].adherenceLabel, "stop_not_honored");

    const [outcome] = await ctx.outcomes.listOwned("u1");
    assert.equal(outcome.adherenceLabel, "stop_not_honored");
    assert.equal(outcome.planId, "p1");
    assert.equal(outcome.netPnlKrw.toNumber(), -12);
    assert.equal(outcome.rMultiple?.toNumber(), -1.2);
    assert.deepEqual(outcome.autoTags, []);

    const second = await ctx.evaluate.execute("u1");
    assert.equal(second.outcomes, 1);
    assert.equal(second.removed, 0);
    assert.equal((await ctx.outcomes.listOwned("u1")).length, 1);
  });

  it("사용자가 확정한 태그는 다음 회차에도 남는다 · 지운 매도의 결과는 사라진다", async () => {
    const ctx = setup({
      ledger: [tx("b1", "buy", "2026-01-01T01:00:00Z", 100), tx("s1", "sell", "2026-01-05T01:00:00Z", 88)],
    });
    await ctx.evaluate.execute("u1");
    const [outcome] = await ctx.outcomes.listOwned("u1");
    assert.deepEqual(outcome.autoTags, ["off_plan"]);

    await new ConfirmOutcomeTags(ctx.outcomes).execute("u1", outcome.id, [" chasing ", "chasing", "새벽"]);
    await ctx.evaluate.execute("u1");
    const [after] = await ctx.outcomes.listOwned("u1");
    assert.deepEqual(after.userTags, ["chasing", "새벽"], "공백 · 중복 정리");
    assert.deepEqual(after.autoTags, ["off_plan"], "자동 후보는 원본으로 남는다");

    ctx.state.ledger = [tx("b1", "buy", "2026-01-01T01:00:00Z", 100)];
    const result = await ctx.evaluate.execute("u1");
    assert.equal(result.removed, 1);
    assert.equal((await ctx.outcomes.listOwned("u1")).length, 0);
  });

  it("거래가 상한에 잘리면 아무것도 쓰지 않는다 — 합이 거짓이 된다", async () => {
    const ctx = setup({ ledger: [tx("b1", "buy", "2026-01-01T01:00:00Z", 100)], truncated: true, plans: [plan({})] });
    const result = await ctx.evaluate.execute("u1");
    assert.equal(result.status, "truncated");
    assert.equal(ctx.plans.rows[0].adherenceEvaluatedAt, null);
  });
});

describe("EvaluateTradeDecisions · 국내 주식 (F011 FR-47)", () => {
  /** 국내 일봉은 거래일 00:00 UTC 로 온다(`forecastSymbol.dailyOpenTime`) */
  const krBars: DailyBar[] = [
    { openTime: new Date("2026-01-12T00:00:00Z"), close: new Decimal(100) },
    { openTime: new Date("2026-01-13T00:00:00Z"), close: new Decimal(85) },
    { openTime: new Date("2026-01-14T00:00:00Z"), close: new Decimal(95) },
  ];
  const kr = (id: string, side: "buy" | "sell", date: string, price: number): CoachLedgerEntry => ({
    ...tx(id, side, `${date}T00:00:00+09:00`, price),
    symbol: "005930",
  });

  it("국내 회차가 따로 돌고 · 코인 회차가 국내 결과를 지우지 않는다", async () => {
    const ctx = setup({
      ledger: [tx("b1", "buy", "2026-01-01T01:00:00Z", 100), tx("s1", "sell", "2026-01-05T01:00:00Z", 88)],
      krLedger: [kr("kb1", "buy", "2026-01-13", 90), kr("ks1", "sell", "2026-01-14", 95)],
      plans: [plan({}), plan({ id: "kp1", transactionId: "kb1", symbol: "005930", stopPrice: new Decimal(80) })],
      krBars,
    });
    const result = await ctx.evaluate.execute("u1");
    assert.equal(result.outcomes, 2);
    assert.deepEqual((await ctx.outcomes.listOwned("u1")).map((row) => row.closingTransactionId), ["s1"]);
    assert.deepEqual((await ctx.outcomes.listOwned("u1", 10, "kr_stock")).map((row) => row.closingTransactionId), ["ks1"]);
    assert.equal(ctx.plans.rows[0].adherenceLabel, "stop_not_honored", "코인 계획은 코인 회차가");
    assert.equal(ctx.plans.rows[1].adherenceLabel, "honored", "국내 계획은 국내 회차가 — 산 날(01-13) 종가 85 > 손절 80");

    ctx.state.krLedger = [];
    const second = await ctx.evaluate.execute("u1");
    assert.equal(second.removed, 1, "지운 국내 매도의 결과만 사라진다");
    assert.equal((await ctx.outcomes.listOwned("u1")).length, 1);
  });

  it("00:00 KST 로 적은 국내 매수에 전 거래일 종가를 '산 뒤'로 세지 않는다", async () => {
    // 01-13 00:00 KST 매수 · 손절 90. 전 거래일(01-12) 종가 80 · 그날 91 — 산 뒤 위반은 없다
    const ctx = setup({
      ledger: [],
      krLedger: [kr("kb1", "buy", "2026-01-13", 92)],
      plans: [plan({ id: "kp1", transactionId: "kb1", symbol: "005930", stopPrice: new Decimal(90) })],
      krBars: [
        { openTime: new Date("2026-01-12T00:00:00Z"), close: new Decimal(80) },
        { openTime: new Date("2026-01-13T00:00:00Z"), close: new Decimal(91) },
      ],
    });
    await ctx.evaluate.execute("u1");
    assert.equal(ctx.plans.rows[0].adherenceLabel, "honored", "전날 종가 80 은 사기 전 — 봉을 옮기지 않으면 stop_not_honored");
  });
});

describe("GetBehaviorMirror", () => {
  it("배치 결과로 준수율 · 태그 비용을 센다", async () => {
    const ctx = setup({
      ledger: [tx("b1", "buy", "2026-01-01T01:00:00Z", 100), tx("s1", "sell", "2026-01-05T01:00:00Z", 88)],
      plans: [plan({})],
    });
    await ctx.evaluate.execute("u1");
    const view = await ctx.mirror.execute("u1");
    assert.equal(view.status, "ok");
    assert.equal(view.adherence?.rate.value?.toNumber(), 0);
    assert.equal(view.adherence?.violatedAvgReturn.value?.toNumber(), -0.12);
    assert.equal(view.outcomeCount, 1);
    assert.equal(view.minSample, 20);
    assert.equal(view.tagCosts.length, 0, "계획이 있는 청산이라 off_plan 이 아니다");
  });
});

describe("ConfirmOutcomeTags", () => {
  it("남의 결과는 없는 것과 같다", async () => {
    await assert.rejects(
      new ConfirmOutcomeTags(new MemoryOutcomes()).execute("u1", "nope", []),
      (error: unknown) =>
        (error as { code?: string }).code === "COACH_DECISION_OUTCOME_NOT_FOUND" &&
        (error as { kind?: ErrorKind }).kind === ErrorKind.NotFound
    );
  });
});
