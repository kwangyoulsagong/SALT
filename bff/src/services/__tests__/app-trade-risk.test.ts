import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appTradeRiskService } from "../app-trade-risk.service";
import { backendApi } from "../backend-api.service";
import {
  toRecordedTransaction,
  toRiskBudgetViewModel,
  toSizeCheckViewModel,
  toTradePlanList,
} from "../trade-risk.viewmodel";

/** F009 거래 기록 · 계획 · 사이즈 계산 · 리스크 예산 (`BFF-REQ-038`). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const sizeCheck = (over: Record<string, unknown> = {}) => ({
  symbol: "BTC",
  side: "buy",
  status: "ok",
  maxLossKrw: 420_000,
  lossPerUnitKrw: 8_400_000,
  perTradeBudgetRate: 0.84,
  monthlyBudgetRemainingRate: 0.28,
  monthlyBudgetRemainingKrw: 1_500_000,
  referenceMaxQuantity: { value: 0.0595, limitedBy: "per_trade_budget" },
  volTargetWeight: 0.288462,
  currentWeight: 0.31,
  projectedWeight: 0.36,
  consecutiveLoss: { count: 5, amountKrw: 2_100_000, monthlyBudgetRate: 1.4 },
  kelly: null,
  unavailable: {},
  assumptions: {
    feeRatePerSide: 0.0005,
    stopGapAssumed: false,
    targetVolatility: 0.15,
    targetVolatilityIsDefault: true,
    maxSingleAssetWeight: 0.6,
  },
  volatilityAsOf: "2026-09-23",
  asOf: "2026-09-24T01:00:00.000Z",
  orderExecution: false,
  ...over,
});

const plan = (over: Record<string, unknown> = {}) => ({
  id: "0b3c9b1e-6f1a-4b8e-9a52-2b8d6f0c1a11",
  transactionId: null,
  symbol: "BTC",
  side: "buy",
  stopPrice: 88_300_000,
  targetPrice: null,
  plannedQuantity: null,
  thesis: "200일선 지지",
  invalidation: null,
  reviewAt: null,
  probabilityUp: null,
  plannedAt: "2026-09-24T01:00:00.000Z",
  locked: false,
  adherence: { label: null, userLabel: null, evaluatedAt: null },
  createdAt: "2026-09-24T01:00:00.000Z",
  updatedAt: "2026-09-24T01:00:00.000Z",
  ...over,
});

describe("toSizeCheckViewModel", () => {
  it("서버 숫자를 그대로 옮긴다 — 계산하지 않는다", () => {
    const v = toSizeCheckViewModel(sizeCheck());
    assert.equal(v.maxLossKrw, 420_000);
    assert.equal(v.monthlyBudgetRemainingRate, 0.28);
    assert.deepEqual(v.referenceMaxQuantity, { value: 0.0595, limitedBy: "per_trade_budget" });
    assert.equal(v.orderExecution, false);
  });

  it("숫자 자리가 깨지면 null — 0 으로 채우지 않는다", () => {
    const v = toSizeCheckViewModel(sizeCheck({ maxLossKrw: "420000", volTargetWeight: Number.NaN }));
    assert.equal(v.maxLossKrw, null);
    assert.equal(v.volTargetWeight, null);
  });

  it("못 구한 값의 사유를 옮기고, 모르는 사유는 버린다", () => {
    const v = toSizeCheckViewModel(
      sizeCheck({ maxLossKrw: null, unavailable: { maxLoss: "stop_price_missing", currentWeight: "made_up" } }),
    );
    assert.deepEqual(v.unavailable, { maxLoss: "stop_price_missing" });
  });

  it("주문 실행을 말하는 응답은 계약 깨짐이다", () => {
    assert.throws(() => toSizeCheckViewModel(sizeCheck({ orderExecution: true })));
    assert.throws(() => toSizeCheckViewModel(sizeCheck({ side: "short" })));
  });

  it("켈리는 네 값이 다 있을 때만, 문장은 코드로", () => {
    const v = toSizeCheckViewModel(sizeCheck({ kelly: { full: 0.2, half: 0.1, quarter: 0.05, hasEdge: true } }));
    assert.deepEqual(v.kelly, { full: 0.2, half: 0.1, quarter: 0.05, hasEdge: true, noteCode: "edge_estimate_uncertain" });
    assert.equal(toSizeCheckViewModel(sizeCheck({ kelly: { full: 0.2 } })).kelly, null);
  });
});

describe("toRiskBudgetViewModel", () => {
  const budget = {
    settings: {
      monthlyLossBudget: { amount: 1_500_000, unit: "krw" },
      perTradeMaxLoss: null,
      monthlyLossBudgetKrw: 1_500_000,
      perTradeMaxLossKrw: null,
      targetVolatility: 0.15,
      targetVolatilityIsDefault: true,
    },
    totalValueKrw: 10_000_000,
    gauges: {
      drawdown: { status: "ok", budgetKrw: 1_500_000, usedKrw: 620_000, usedRate: 0.413333, monthPnlKrw: -620_000, missingCloses: [] },
      concentration: { status: "exceeded", topSymbol: "BTC", topWeight: 0.71, limit: 0.6 },
      turnover: { status: "ok", trailingYearTurnover: 3.2, tradedNotionalKrw: 32_000_000, feesYearToDateKrw: 184_000, tradeCount: 41 },
    },
    monthStart: "2026-09-01",
    asOf: "2026-09-24T01:00:00.000Z",
  };

  it("게이지 3개와 설정을 옮긴다", () => {
    const v = toRiskBudgetViewModel(budget);
    assert.equal(v.gauges.drawdown.usedRate, 0.413333);
    assert.equal(v.gauges.concentration.status, "exceeded");
    assert.deepEqual(v.settings.monthlyLossBudget, { amount: 1_500_000, unit: "krw" });
    assert.equal(v.settings.perTradeMaxLoss, null);
  });

  it("모르는 게이지 상태는 '데이터 부족'이다 — '정상'으로 올리지 않는다", () => {
    const v = toRiskBudgetViewModel({
      ...budget,
      gauges: { ...budget.gauges, drawdown: { ...budget.gauges.drawdown, status: "great" } },
    });
    assert.equal(v.gauges.drawdown.status, "insufficient_data");
  });
});

describe("toTradePlanList · toRecordedTransaction", () => {
  it("깨진 계획 행만 빼고 나머지는 둔다", () => {
    const list = toTradePlanList([plan(), plan({ id: 3 }), null]);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.thesis, "200일선 지지");
  });

  it("거래의 Decimal 문자열을 숫자로 읽는다", () => {
    const tx = toRecordedTransaction({
      id: "tx-1",
      symbol: "BTC",
      transactionType: "buy",
      quantity: "0.05",
      price: "91200000",
      fee: "0",
      transactionDate: "2026-09-24T01:00:00.000Z",
    });
    assert.deepEqual(tx, {
      id: "tx-1",
      symbol: "BTC",
      side: "buy",
      quantity: 0.05,
      price: 91_200_000,
      fee: 0,
      transactionDate: "2026-09-24T01:00:00.000Z",
    });
  });
});

describe("AppTradeRiskService", () => {
  afterEach(() => mock.restoreAll());

  it("사이즈 계산 5xx 는 200 unavailable, 4xx 는 그대로", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    assert.deepEqual(await appTradeRiskService.sizeCheck("t", { symbol: "BTC" }), { status: "unavailable" });

    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(400);
    });
    await assert.rejects(() => appTradeRiskService.sizeCheck("t", { symbol: "BTC" }));
  });

  it("사이즈 계산은 POST 라 재시도하지 않는다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    await appTradeRiskService.sizeCheck("t", { symbol: "BTC" });
    assert.equal(call.mock.callCount(), 1);
  });

  it("거래 → 계획 순서로, 계획에 거래 id 를 싣는다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async (method: string, url: string) => {
      if (url === "/portfolio/transactions") {
        return ok({ id: "0b3c9b1e-6f1a-4b8e-9a52-2b8d6f0c1a99", symbol: "BTC", transactionType: "buy", quantity: "0.05", price: "91200000", fee: "0", transactionDate: "2026-09-24T01:00:00.000Z" });
      }
      return ok(plan({ transactionId: "0b3c9b1e-6f1a-4b8e-9a52-2b8d6f0c1a99", locked: true }));
    });
    const result = await appTradeRiskService.recordTrade("t", {
      symbol: "BTC",
      side: "buy",
      quantity: 0.05,
      price: 91_200_000,
      plan: { stopPrice: 88_300_000, thesis: "  200일선 지지 " },
    });
    assert.equal(result.plan.status, "ok");
    const planCall = call.mock.calls[1];
    assert.equal(planCall?.arguments[1], "/coach/plans");
    assert.deepEqual(planCall?.arguments[3], {
      symbol: "BTC",
      side: "buy",
      transactionId: "0b3c9b1e-6f1a-4b8e-9a52-2b8d6f0c1a99",
      stopPrice: 88_300_000,
      thesis: "200일선 지지",
    });
  });

  it("계획이 없으면 서버를 한 번만 부른다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () =>
      ok({ id: "tx", symbol: "BTC", transactionType: "sell", quantity: 1, price: 1, transactionDate: "2026-09-24T01:00:00.000Z" }),
    );
    const result = await appTradeRiskService.recordTrade("t", {
      symbol: "BTC",
      side: "sell",
      quantity: 1,
      price: 1,
      plan: { thesis: "   " },
    });
    assert.deepEqual(result.plan, { status: "none" });
    assert.equal(call.mock.callCount(), 1);
  });

  it("계획이 실패해도 거래는 성공이다 — 되돌리지 않고 plan 만 unavailable", async () => {
    mock.method(backendApi, "proxyAuthRequest", async (_method: string, url: string) => {
      if (url === "/portfolio/transactions") {
        return ok({ id: "tx", symbol: "BTC", transactionType: "buy", quantity: 1, price: 1, transactionDate: "2026-09-24T01:00:00.000Z" });
      }
      throw httpError(500);
    });
    const result = await appTradeRiskService.recordTrade("t", {
      symbol: "BTC",
      side: "buy",
      quantity: 1,
      price: 1,
      plan: { stopPrice: 0.9 },
    });
    assert.equal(result.transaction.id, "tx");
    assert.deepEqual(result.plan, { status: "unavailable" });
  });

  it("거래 실패(보유 부족 400)는 그대로 올리고 계획을 만들지 않는다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(400);
    });
    await assert.rejects(() =>
      appTradeRiskService.recordTrade("t", { symbol: "BTC", side: "sell", quantity: 9, price: 1, plan: { stopPrice: 1 } }),
    );
    assert.equal(call.mock.callCount(), 1);
  });

  it("계획 목록은 서버의 { plans } 를 푼다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ok({ plans: [plan()] }));
    const result = await appTradeRiskService.listPlans("t", "BTC");
    assert.ok(result.status === "ok" && result.plans.length === 1);
  });
});
