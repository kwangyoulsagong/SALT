import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { buildMonthlyReview, replayLedger, type CoachLedgerEntry, type DailyBar } from "../../domain";
import { toMonthlyReviewResponse } from "../dto/monthlyReviewView";

/**
 * 월간 복기 응답(F009 슬라이스 6) — 저장 JSON(숫자 문자열)에서 미러와 같은 반올림으로 옮긴다.
 */

const entry = (id: string, side: "buy" | "sell", iso: string, price: number): CoachLedgerEntry => ({
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

describe("toMonthlyReviewResponse", () => {
  const entries = [entry("b1", "buy", "2026-01-01T01:00:00Z", 300)];
  const bars = new Map([["BTC", [bar("2026-01-01", 300), bar("2026-01-02", 301), bar("2026-01-03", 302)]]]);
  const review = buildMonthlyReview({
    month: "2026-01",
    entries,
    replay: replayLedger(entries),
    barsBySymbol: bars,
    linkedPlans: [],
    outcomes: [],
    forecastPlans: [],
    monthlyLossBudget: { amount: new Decimal("0.1"), unit: "percent" },
    maxSingleAssetWeight: new Decimal("0.6"),
    now: new Date("2026-02-02T00:00:00Z"),
  });
  const stored = { month: "2026-01", payload: JSON.parse(JSON.stringify(review)), generatedAt: new Date("2026-02-01T21:40:00Z") };

  it("비율은 소수 6자리 숫자 · 금액은 원 정수 · 없는 값은 null", () => {
    const body = toMonthlyReviewResponse({ month: "2026-01", status: "ok", review: stored, availableMonths: ["2026-01"] });
    assert.ok(body.review);
    // 01-01 300 → 01-02 301 → 01-03 302(1월 말까지 닫힌 봉만 있는 세트): TWR 302 ÷ 300 − 1
    assert.equal(body.review.benchmark.actualReturn, new Decimal(302).div(300).minus(1).toDecimalPlaces(6).toNumber());
    // (300 ÷ 2) ÷ 302
    assert.equal(body.review.turnover.value, new Decimal(150).div(302).toDecimalPlaces(6).toNumber());
    assert.equal(body.review.turnover.tradedNotionalKrw, 300);
    assert.equal(body.review.ipsDeviation.concentration.limit, 0.6);
    // 월초에 보유가 없었다 → 비율 예산을 원으로 못 바꾼다
    assert.equal(body.review.ipsDeviation.lossBudget.status, "insufficient_data");
    assert.equal(body.review.ipsDeviation.lossBudget.budgetKrw, null);
    assert.equal(body.review.brier.meanScore.value, null);
    assert.equal(body.review.topMistake, null);
    assert.equal(body.review.oneThing, "1월에는 청산한 거래가 없어요.");
  });

  it("복기가 없으면 상태와 목록만", () => {
    const body = toMonthlyReviewResponse({ month: "2026-02", status: "month_not_closed", review: null, availableMonths: [] });
    assert.deepEqual(body, { month: "2026-02", status: "month_not_closed", review: null, availableMonths: [] });
  });
});
