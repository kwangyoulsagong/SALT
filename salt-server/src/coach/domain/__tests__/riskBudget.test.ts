import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import type { CoachLedgerEntry } from "../model";
import {
  concentrationGauge,
  drawdownGauge,
  lockedFieldChanges,
  monthToDatePnl,
  resolveBudget,
  turnoverGauge,
  type TradePlan,
} from "../policy";

/**
 * 리스크 예산 · 게이지 (FEATURE-009 FR-1~3 · FR-17 · FR-23~24) + 계획 잠금(FR-9).
 * 기대값은 손으로 푼 값이다.
 */

const trade = (overrides: Partial<CoachLedgerEntry> & Pick<CoachLedgerEntry, "symbol" | "side">): CoachLedgerEntry => ({
  id: `${overrides.symbol}-${overrides.side}`,
  quantity: 1,
  price: 1,
  totalAmount: 1,
  fee: 0,
  transactionDate: new Date("2026-09-10T00:00:00Z"),
  ...overrides,
});

const krw = (money: Money | null) => money?.toKrwInteger() ?? null;

describe("resolveBudget", () => {
  it("원 예산은 그대로, 비율 예산은 지금 평가금액 × 비율", () => {
    assert.equal(krw(resolveBudget({ amount: new Decimal(300_000), unit: "krw" }, Money.krw(0))), 300_000);
    assert.equal(
      krw(resolveBudget({ amount: new Decimal("0.1"), unit: "percent" }, Money.krw(5_000_000))),
      500_000
    );
  });

  it("정하지 않았거나, 비율인데 평가금액이 0 이면 null — 0 이 아니다", () => {
    assert.equal(resolveBudget(null, Money.krw(5_000_000)), null);
    assert.equal(resolveBudget({ amount: new Decimal("0.1"), unit: "percent" }, Money.krw(0)), null);
  });
});

describe("monthToDatePnl — 평단 없이 시가 평가 손익", () => {
  // BTC: 지금 0.02개 = 2,000,000. 이번 달 0.01개 @ 95M 매수(950,000 + 수수료 475) → 월초 0.01개 @ 월초 90M
  // ETH: 이번 달 1개 @ 4M 전량 매도(수수료 2,000) → 월초 1개 @ 월초 3.8M, 지금 0개
  const holdings = [{ symbol: "BTC", quantity: 0.02, value: 2_000_000 }];
  const trades = [
    trade({ symbol: "BTC", side: "buy", quantity: 0.01, price: 95_000_000, totalAmount: 950_000, fee: 475 }),
    trade({ symbol: "ETH", side: "sell", quantity: 1, price: 4_000_000, totalAmount: 4_000_000, fee: 2_000 }),
  ];

  it("월초 평가 4,700,000 · 순유입 −3,047,525 → 손익 +347,525", () => {
    const result = monthToDatePnl({
      holdings,
      trades,
      monthStartCloses: new Map([
        ["BTC", 90_000_000],
        ["ETH", 3_800_000],
      ]),
    });
    assert.equal(result.status, "ok");
    if (result.status !== "ok") return;
    assert.equal(krw(result.startValue), 4_700_000);
    assert.equal(krw(result.netInflow), -3_047_525);
    assert.equal(krw(result.pnl), 347_525);
  });

  it("월초에 보유했던 종목의 월초 종가가 없으면 합을 만들지 않는다", () => {
    const result = monthToDatePnl({ holdings, trades, monthStartCloses: new Map([["BTC", 90_000_000]]) });
    assert.deepEqual(result, { status: "insufficient_data", missingCloses: ["ETH"] });
  });

  it("이번 달에 처음 산 종목은 월초 종가가 필요 없다", () => {
    const result = monthToDatePnl({
      holdings: [{ symbol: "SOL", quantity: 10, value: 2_100_000 }],
      trades: [trade({ symbol: "SOL", side: "buy", quantity: 10, totalAmount: 2_000_000, fee: 1_000 })],
      monthStartCloses: new Map(),
    });
    assert.equal(result.status, "ok");
    if (result.status === "ok") assert.equal(krw(result.pnl), 99_000);
  });
});

describe("drawdownGauge — 막지 않는다, 상태만", () => {
  const month = (pnl: number) =>
    ({ status: "ok", pnl: Money.krw(pnl), startValue: Money.krw(0), netInflow: Money.krw(0) }) as const;

  it("−620,000 / 예산 1,500,000 → 41.33% ok", () => {
    const gauge = drawdownGauge(Money.krw(1_500_000), month(-620_000));
    assert.equal(gauge.status, "ok");
    assert.equal(krw(gauge.used), 620_000);
    assert.equal(gauge.usedRatio?.toDecimalPlaces(4).toNumber(), 0.4133);
  });

  it("예산을 넘으면 exceeded, 이익이면 사용 0", () => {
    assert.equal(drawdownGauge(Money.krw(1_500_000), month(-1_600_000)).status, "exceeded");
    assert.equal(krw(drawdownGauge(Money.krw(1_500_000), month(300_000)).used), 0);
  });

  it("예산이 없으면 budget_not_set — 손익은 준다", () => {
    const gauge = drawdownGauge(null, month(-620_000));
    assert.equal(gauge.status, "budget_not_set");
    assert.equal(gauge.usedRatio, null);
    assert.equal(krw(gauge.monthPnl), -620_000);
  });
});

describe("concentrationGauge — 종목 집중도", () => {
  it("BTC 71% > 상한 60% → exceeded", () => {
    const gauge = concentrationGauge(
      [
        { symbol: "BTC", value: 7_100_000 },
        { symbol: "ETH", value: 2_900_000 },
      ],
      new Decimal("0.6")
    );
    assert.equal(gauge.status, "exceeded");
    assert.equal(gauge.topSymbol, "BTC");
    assert.equal(gauge.topWeight?.toNumber(), 0.71);
  });

  it("보유가 없으면 insufficient_data", () => {
    assert.equal(concentrationGauge([], new Decimal("0.6")).status, "insufficient_data");
  });
});

describe("turnoverGauge", () => {
  const yearStart = new Date("2025-12-31T15:00:00Z");
  const trades = [
    trade({ symbol: "BTC", side: "buy", totalAmount: 12_000_000, fee: 6_000, transactionDate: new Date("2026-03-01T00:00:00Z") }),
    trade({ symbol: "BTC", side: "sell", totalAmount: 8_000_000, fee: 4_000, transactionDate: new Date("2025-11-01T00:00:00Z") }),
  ];

  it("(매수 + 매도) ÷ 2 ÷ 평가금액 = 1.0배 · 올해 수수료만", () => {
    const gauge = turnoverGauge({ trades, totalValue: Money.krw(10_000_000), yearStart, truncated: false });
    assert.equal(gauge.trailingYearTurnover?.toNumber(), 1);
    assert.equal(krw(gauge.feesYearToDate), 6_000);
    assert.equal(gauge.tradeCount, 2);
  });

  it("거래를 다 읽지 못했으면 회전율 · 수수료 둘 다 null", () => {
    const gauge = turnoverGauge({ trades, totalValue: Money.krw(10_000_000), yearStart, truncated: true });
    assert.equal(gauge.status, "insufficient_data");
    assert.equal(gauge.trailingYearTurnover, null);
    assert.equal(gauge.feesYearToDate, null);
  });
});

describe("lockedFieldChanges — 거래에 연결된 계획의 채점 기준", () => {
  const plan = (transactionId: string | null): TradePlan => ({
    id: "p1",
    userId: "u1",
    transactionId,
    symbol: "BTC",
    side: "buy",
    stopPrice: new Decimal(92_000_000),
    targetPrice: null,
    plannedQuantity: new Decimal("0.01"),
    thesis: null,
    invalidation: null,
    reviewAt: null,
    probabilityUp: null,
    plannedAt: new Date(),
    sampleOrigin: "live",
    adherenceLabel: null,
    adherenceEvaluatedAt: null,
    userAdherenceLabel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it("연결 전에는 무엇이든 바꿀 수 있다", () => {
    assert.deepEqual(lockedFieldChanges(plan(null), { stopPrice: new Decimal(1) }), []);
  });

  it("연결 뒤: 같은 값은 통과, 다른 값 · 지우기는 잠김, 기록 필드는 자유", () => {
    const linked = plan("tx1");
    assert.deepEqual(lockedFieldChanges(linked, { stopPrice: new Decimal("92000000.0") }), []);
    assert.deepEqual(lockedFieldChanges(linked, { stopPrice: new Decimal(90_000_000) }), ["stopPrice"]);
    assert.deepEqual(lockedFieldChanges(linked, { plannedQuantity: null, probabilityUp: new Decimal("0.6") }), [
      "plannedQuantity",
      "probabilityUp",
    ]);
    assert.deepEqual(lockedFieldChanges(linked, { thesis: "고쳐 적음", targetPrice: new Decimal(1) }), []);
  });
});
