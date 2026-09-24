import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import {
  calculateSizing,
  kellyFraction,
  weightCapQuantity,
  type SizingInput,
} from "../policy";

/**
 * 사이즈 계산 (FEATURE-009 FR-4~8 · `SRV-REQ-038`).
 *
 * 기대값은 손으로 푼 값이다. 기준 입력:
 *   BTC 0.01개 @ 100,000,000원, 손절 92,000,000원, 수수료 0.05%/회
 *   단위 손실 = 8,000,000 + (100,000,000 + 92,000,000) × 0.0005 = 8,096,000
 *   최대 손실 = 80,960
 *   코인 평가금액 10,000,000 · BTC 기존 3,000,000 · 한 종목 상한 60%
 *   1회 예산 100,000 · 월 예산 1,000,000 · 이번 달 사용 200,000
 */

const base = (overrides: Partial<SizingInput> = {}): SizingInput => ({
  side: "buy",
  quantity: new Decimal("0.01"),
  price: Money.krw(100_000_000),
  stopPrice: Money.krw(92_000_000),
  perTradeBudget: Money.krw(100_000),
  monthlyBudget: Money.krw(1_000_000),
  monthlyUsed: Money.krw(200_000),
  totalValue: Money.krw(10_000_000),
  existingSymbolValue: Money.krw(3_000_000),
  maxSingleAssetWeight: new Decimal("0.6"),
  realizedVolatility: new Decimal("0.5"),
  targetVolatility: new Decimal("0.15"),
  ...overrides,
});

const krw = (money: Money | null) => money?.toKrwInteger() ?? null;
const num = (value: Decimal | null | undefined, places = 6) =>
  value ? value.toDecimalPlaces(places).toNumber() : null;

describe("calculateSizing — 손절가 · 예산이 다 있을 때", () => {
  const result = calculateSizing(base());

  it("최대 손실 = 수량 × (진입 − 손절 + 양쪽 수수료)", () => {
    assert.equal(result.status, "ok");
    assert.equal(krw(result.lossPerUnit), 8_096_000);
    assert.equal(krw(result.maxLoss), 80_960);
  });

  it("1회 예산 대비 · 월 예산 잔여 대비", () => {
    assert.equal(num(result.perTradeBudgetRatio), 0.8096);
    assert.equal(krw(result.monthlyBudgetRemaining), 800_000);
    assert.equal(num(result.monthlyBudgetRemainingRatio), 0.1012);
  });

  it("참고 수량 상한 = min(예산 ÷ 단위 손실, 종목 상한 수량) — 여기서는 예산이 묶는다", () => {
    // 100,000 / 8,096,000 = 0.01235177865…  종목 상한: (0.6×10M − 3M) / (100M × 0.4) = 0.075
    assert.equal(result.referenceMaxQuantity?.limitedBy, "per_trade_budget");
    assert.equal(num(result.referenceMaxQuantity?.value, 8), 0.01235178);
  });

  it("비중 · 변동성 타깃은 숫자 둘을 나란히 준다", () => {
    assert.equal(num(result.currentWeight), 0.3);
    assert.equal(num(result.projectedWeight), 0.363636); // 4M / 11M
    assert.equal(num(result.volTargetWeight), 0.3); // 0.15 / 0.5
  });

  it("5연속 손절이면 −404,800 · 월 예산의 40.48%", () => {
    assert.equal(result.consecutiveLoss?.count, 5);
    assert.equal(krw(result.consecutiveLoss?.amount ?? null), 404_800);
    assert.equal(num(result.consecutiveLoss?.monthlyBudgetRatio), 0.4048);
  });

  it("못 구한 값이 없으면 unavailable 이 비어 있고, 켈리 입력이 없으면 켈리가 없다", () => {
    assert.deepEqual(result.unavailable, {});
    assert.equal(result.kelly, null);
  });
});

describe("calculateSizing — 못 구하는 값은 null + 사유 (0 으로 채우지 않는다)", () => {
  it("손절가가 없으면 손실 계열이 stop_price_missing, 참고 수량은 종목 상한만", () => {
    const result = calculateSizing(base({ stopPrice: null }));
    assert.equal(result.status, "ok");
    assert.equal(result.maxLoss, null);
    assert.equal(result.unavailable.maxLoss, "stop_price_missing");
    assert.equal(result.unavailable.perTradeBudgetRatio, "stop_price_missing");
    assert.equal(result.consecutiveLoss, null);
    assert.equal(result.referenceMaxQuantity?.limitedBy, "single_asset_weight");
    assert.equal(num(result.referenceMaxQuantity?.value), 0.075);
  });

  it("손절가가 진입가 이상이면 stop_not_below_entry", () => {
    const result = calculateSizing(base({ stopPrice: Money.krw(100_000_000) }));
    assert.equal(result.status, "stop_not_below_entry");
    assert.equal(result.maxLoss, null);
    assert.equal(result.unavailable.maxLoss, "stop_not_below_entry");
  });

  it("예산을 정하지 않았으면 budget_not_set — 최대 손실 원화는 준다", () => {
    const result = calculateSizing(
      base({ perTradeBudget: null, monthlyBudget: null, monthlyUsed: null })
    );
    assert.equal(krw(result.maxLoss), 80_960);
    assert.equal(result.perTradeBudgetRatio, null);
    assert.equal(result.unavailable.perTradeBudgetRatio, "budget_not_set");
    assert.equal(result.unavailable.monthlyBudgetRemainingRatio, "budget_not_set");
    assert.equal(result.consecutiveLoss?.monthlyBudgetRatio, null);
  });

  it("이번 달 예산을 다 썼으면 monthly_budget_exhausted — 막지는 않는다", () => {
    const result = calculateSizing(base({ monthlyUsed: Money.krw(1_200_000) }));
    assert.equal(result.status, "ok");
    assert.equal(krw(result.monthlyBudgetRemaining), -200_000);
    assert.equal(result.unavailable.monthlyBudgetRemainingRatio, "monthly_budget_exhausted");
  });

  it("월 사용액을 못 구했으면 insufficient_data", () => {
    const result = calculateSizing(base({ monthlyUsed: null }));
    assert.equal(result.unavailable.monthlyBudgetRemainingRatio, "insufficient_data");
  });

  it("실현 변동성이 없으면 변동성 타깃은 insufficient_data, 있으면 최대 1", () => {
    assert.equal(
      calculateSizing(base({ realizedVolatility: null })).unavailable.volTargetWeight,
      "insufficient_data"
    );
    assert.equal(num(calculateSizing(base({ realizedVolatility: new Decimal("0.1") })).volTargetWeight), 1);
  });

  it("보유가 없으면 현재 비중을 구할 수 없고 종목 상한 수량도 없다", () => {
    const result = calculateSizing(
      base({ totalValue: Money.krw(0), existingSymbolValue: Money.krw(0) })
    );
    assert.equal(result.currentWeight, null);
    assert.equal(result.unavailable.currentWeight, "no_portfolio_value");
    assert.equal(num(result.projectedWeight), 1);
    assert.equal(result.referenceMaxQuantity?.limitedBy, "per_trade_budget");
  });
});

describe("calculateSizing — 매도", () => {
  it("손실 크기 계산 대상이 아니다. 매도 뒤 비중만", () => {
    const result = calculateSizing(base({ side: "sell" }));
    assert.equal(result.status, "sell_side");
    assert.equal(result.maxLoss, null);
    assert.equal(result.unavailable.maxLoss, "not_applicable_sell");
    assert.equal(num(result.projectedWeight), 0.222222); // 2M / 9M
  });
});

describe("weightCapQuantity", () => {
  it("상한이 100% 면 상한이 없다", () => {
    assert.equal(
      weightCapQuantity(new Decimal(1), Money.krw(10), Money.krw(5), Money.krw(1)),
      null
    );
  });

  it("이미 상한을 넘었으면 0", () => {
    const cap = weightCapQuantity(
      new Decimal("0.5"),
      Money.krw(10_000_000),
      Money.krw(7_000_000),
      Money.krw(1_000)
    );
    assert.equal(cap?.toNumber(), 0);
  });
});

describe("kellyFraction (FR-6)", () => {
  it("승률 55% · 손익비 1.5 → 풀 25% · 1/2 12.5% · 1/4 6.25%", () => {
    const kelly = kellyFraction(new Decimal("0.55"), new Decimal("1.5"));
    assert.equal(kelly.full.toNumber(), 0.25);
    assert.equal(kelly.half.toNumber(), 0.125);
    assert.equal(kelly.quarter.toNumber(), 0.0625);
    assert.equal(kelly.hasEdge, true);
  });

  it("기대값이 음이면 음수 그대로 · hasEdge false", () => {
    const kelly = kellyFraction(new Decimal("0.4"), new Decimal("1"));
    assert.equal(kelly.full.toNumber(), -0.2);
    assert.equal(kelly.hasEdge, false);
  });
});
