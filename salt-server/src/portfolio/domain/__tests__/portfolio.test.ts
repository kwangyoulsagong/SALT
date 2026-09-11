import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPerformanceSeries,
  rangeStart,
  rankByProfitRate,
  recalculateHolding,
  revalue,
  shouldKeepHolding,
  summarizeHoldings,
  type TransactionFact,
} from "../index";

/**
 * **이 계산은 지금까지 한 번도 검증된 적이 없다.**
 *
 * 원문에서는 `private updateHolding()` 안에 Prisma 조회와 저장 사이에 끼어 있었고,
 * DB 가 비어 있어(체크리스트 §5) 실행조차 되지 않았다. 순수 함수로 꺼낸 첫 이득이 이것이다.
 */

const buy = (quantity: number, price: number, fee = 0): TransactionFact => ({
  transactionType: "buy",
  quantity,
  price,
  totalAmount: quantity * price,
  fee,
});

const sell = (quantity: number, price: number, fee = 0): TransactionFact => ({
  transactionType: "sell",
  quantity,
  price,
  totalAmount: quantity * price,
  fee,
});

/** 원문의 `Float` 산술. 이관 결과와 대조하기 위해 그대로 옮겨 왔다. */
const originalFloatArithmetic = (transactions: TransactionFact[]) => {
  let totalQuantity = 0;
  let totalInvested = 0;
  let realizedProfit = 0;
  const buyQueue: Array<{ quantity: number; price: number }> = [];

  for (const tx of transactions) {
    if (tx.transactionType === "buy") {
      totalQuantity += tx.quantity;
      totalInvested += tx.totalAmount + tx.fee;
      buyQueue.push({ quantity: tx.quantity, price: tx.price });
    } else {
      totalQuantity -= tx.quantity;
      let remainingSell = tx.quantity;
      let costBasis = 0;

      while (remainingSell > 0 && buyQueue.length > 0) {
        const lot = buyQueue[0];
        const sellQty = Math.min(remainingSell, lot.quantity);
        costBasis += sellQty * lot.price;
        remainingSell -= sellQty;
        lot.quantity -= sellQty;
        if (lot.quantity === 0) buyQueue.shift();
      }

      realizedProfit += tx.totalAmount - costBasis - tx.fee;
      totalInvested -= costBasis;
    }
  }

  return {
    totalQuantity,
    totalInvested,
    realizedProfit,
    averageBuyPrice: totalQuantity > 0 ? totalInvested / totalQuantity : 0,
  };
};

describe("보유 재계산 (FIFO)", () => {
  it("매수만 있으면 수수료가 원가에 포함된다", () => {
    const snapshot = recalculateHolding([buy(2, 100, 10)]);

    assert.equal(snapshot.totalQuantity.toNumber(), 2);
    assert.equal(snapshot.totalInvested.toNumber(), 210);
    assert.equal(snapshot.averageBuyPrice.toNumber(), 105);
    assert.equal(snapshot.realizedProfit.toNumber(), 0);
  });

  it("먼저 산 것부터 원가를 소진한다", () => {
    // 100원 1개 → 200원 1개 순으로 사고 1개를 300원에 판다
    const snapshot = recalculateHolding([buy(1, 100), buy(1, 200), sell(1, 300)]);

    // FIFO 라 원가는 100 (200 이 아니다) → 실현이익 200
    assert.equal(snapshot.realizedProfit.toNumber(), 200);
    assert.equal(snapshot.totalQuantity.toNumber(), 1);
    assert.equal(snapshot.totalInvested.toNumber(), 200);
  });

  it("lot 을 걸쳐 매도하면 두 원가가 비례로 섞인다", () => {
    const snapshot = recalculateHolding([
      buy(1, 100),
      buy(1, 200),
      sell(1.5, 400),
    ]);

    // 원가 = 100×1 + 200×0.5 = 200, 매도금액 600 → 실현이익 400
    assert.equal(snapshot.realizedProfit.toNumber(), 400);
    assert.equal(snapshot.totalQuantity.toNumber(), 0.5);
  });

  /**
   * **매수 기록 없이 매도가 들어오면 원가가 0 이다** (원문 동작). 원장 import 이전
   * 이력이 그렇고, 그때 매도 전액이 실현 이익이 된다. 사실과 다를 수 있다는 것을
   * 드러내는 것은 `invoice` 의 원장 건강도(F001)가 한다.
   */
  it("매수 없이 매도하면 원가 0 으로 본다", () => {
    const snapshot = recalculateHolding([sell(1, 300, 5)]);

    assert.equal(snapshot.realizedProfit.toNumber(), 295);
    assert.equal(snapshot.totalQuantity.toNumber(), -1);
    // 수량이 음수면 평균가는 0 이다 — 부호가 뒤집힌 값을 내지 않는다
    assert.equal(snapshot.averageBuyPrice.toNumber(), 0);
    assert.equal(shouldKeepHolding(snapshot), false);
  });

  it("수량이 0 이 되면 보유를 남기지 않는다", () => {
    const snapshot = recalculateHolding([buy(1, 100), sell(1, 150)]);

    assert.equal(snapshot.totalQuantity.toNumber(), 0);
    assert.equal(shouldKeepHolding(snapshot), false);
    assert.equal(snapshot.realizedProfit.toNumber(), 50);
  });

  /**
   * `Decimal` 로 바꾼 **이유가 이것**이다. 0.1 단위 매수 1,000건에서 `Float` 는
   * 수량 합계에 오차를 남기고, 그 수량이 평균 매수가의 분모다.
   */
  it("Float 누적 오차를 남기지 않는다 — 원문은 남긴다", () => {
    const many = Array.from({ length: 1000 }, () => buy(0.1, 100));

    const migrated = recalculateHolding(many);
    const original = originalFloatArithmetic(many);

    assert.equal(migrated.totalQuantity.toNumber(), 100);
    assert.notEqual(original.totalQuantity, 100);
    assert.ok(
      Math.abs(original.totalQuantity - 100) < 1e-9,
      "원문 오차는 작지만 0 이 아니다"
    );
  });

  it("현실적인 거래 열에서 원문과 같은 답을 낸다 (1원 이내)", () => {
    const transactions = [
      buy(0.5, 130_000_000, 65_000),
      buy(0.25, 142_000_000, 35_500),
      sell(0.3, 155_000_000, 46_500),
      buy(1.125, 98_000_000, 110_250),
      sell(0.875, 121_000_000, 105_875),
    ];

    const migrated = recalculateHolding(transactions);
    const original = originalFloatArithmetic(transactions);

    const near = (a: number, b: number, label: string) =>
      assert.ok(
        Math.abs(a - b) < 1,
        `${label}: 이관 ${a} vs 원문 ${b} — 차이가 1원을 넘는다`
      );

    near(migrated.totalQuantity.toNumber(), original.totalQuantity, "수량");
    near(migrated.totalInvested.toNumber(), original.totalInvested, "투자금");
    near(migrated.realizedProfit.toNumber(), original.realizedProfit, "실현손익");
    near(
      migrated.averageBuyPrice.toNumber(),
      original.averageBuyPrice,
      "평균단가"
    );
  });
});

describe("보유 합산", () => {
  const holding = (overrides: Partial<Parameters<typeof summarizeHoldings>[0][0]> = {}) => ({
    totalInvested: 1000,
    currentValue: 1200,
    unrealizedProfit: 200,
    realizedProfit: 50,
    unrealizedProfitRate: 20,
    ...overrides,
  });

  it("총손익은 미실현 + 실현이고 수익률은 투자금 대비다", () => {
    const totals = summarizeHoldings([holding(), holding()]);

    assert.equal(totals.totalValue, 2400);
    assert.equal(totals.totalInvested, 2000);
    assert.equal(totals.totalProfit, 500);
    assert.equal(totals.totalProfitRate, 25);
  });

  it("투자금이 0 이면 수익률은 0 이다 (나누지 않는다)", () => {
    const totals = summarizeHoldings([
      holding({ totalInvested: 0, currentValue: 0, unrealizedProfit: 0, realizedProfit: 0 }),
    ]);

    assert.equal(totals.totalProfitRate, 0);
    assert.ok(Number.isFinite(totals.totalProfitRate));
  });

  it("보유가 없으면 전부 0 이다", () => {
    assert.deepEqual(summarizeHoldings([]), {
      totalValue: 0,
      totalInvested: 0,
      totalProfit: 0,
      totalProfitRate: 0,
      unrealizedProfit: 0,
      realizedProfit: 0,
    });
  });

  it("평가는 수량 × 현재가이고 투자금이 0 이면 수익률이 0 이다", () => {
    assert.deepEqual(revalue({ totalQuantity: 2, totalInvested: 100 }, 80), {
      currentPrice: 80,
      currentValue: 160,
      unrealizedProfit: 60,
      unrealizedProfitRate: 60,
    });

    assert.equal(
      revalue({ totalQuantity: 2, totalInvested: 0 }, 80).unrealizedProfitRate,
      0
    );
  });

  it("보유가 하나면 최고와 최저가 같은 행이다 (원문 동작)", () => {
    const only = { unrealizedProfitRate: 7 };
    const { best, worst } = rankByProfitRate([only]);

    assert.equal(best, only);
    assert.equal(worst, only);
  });

  it("보유가 없으면 둘 다 null 이다", () => {
    assert.deepEqual(rankByProfitRate([]), { best: null, worst: null });
  });
});

describe("성과 시계열", () => {
  const at = (iso: string) => new Date(iso);

  it("같은 시점의 심볼별 평가액을 합한다", () => {
    const points = buildPerformanceSeries(
      [
        { symbol: "BTC", totalQuantity: 2 },
        { symbol: "ETH", totalQuantity: 10 },
      ],
      [
        { symbol: "BTC", close: 100, timestamp: at("2026-09-11T00:00:00Z") },
        { symbol: "ETH", close: 5, timestamp: at("2026-09-11T00:00:00Z") },
        { symbol: "BTC", close: 110, timestamp: at("2026-09-11T01:00:00Z") },
      ]
    );

    assert.deepEqual(points, [
      { timestamp: at("2026-09-11T00:00:00Z").getTime(), value: 250 },
      { timestamp: at("2026-09-11T01:00:00Z").getTime(), value: 220 },
    ]);
  });

  /**
   * **보유하지 않은 심볼의 가격은 무시된다.** 반대로 보유한 심볼의 캔들이 결측이면
   * 그 시점 합계가 조용히 작아진다 — `degraded` 로 드러내는 것은 F006 의 일이다.
   */
  it("보유하지 않은 심볼은 합산하지 않는다", () => {
    const points = buildPerformanceSeries(
      [{ symbol: "BTC", totalQuantity: 1 }],
      [{ symbol: "DOGE", close: 999, timestamp: at("2026-09-11T00:00:00Z") }]
    );

    assert.deepEqual(points, []);
  });

  it("아는 구간이 아니면 전체다 (원문의 default)", () => {
    const now = at("2026-09-11T00:00:00Z");

    assert.equal(rangeStart("7d", now).toISOString(), "2026-09-04T00:00:00.000Z");
    assert.equal(rangeStart("all", now).getTime(), 0);
    assert.equal(rangeStart("이상한값", now).getTime(), 0);
  });
});
