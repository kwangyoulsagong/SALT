import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import type { DailyBar } from "..";
import { portfolioVolatility } from "../policy";

/**
 * F011 FR-46 보유 합산 변동성 — 상관 1 상한 · 실현 상관 범위, KRX 거래일 축 as-of 정렬, 끊긴 날 제외, 표본 기준.
 */

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse("2026-01-05T00:00:00Z"); // 월요일

/** 날마다(코인) 또는 평일만(국내) — 종가는 `closeAt(달력일 순번)` */
const bars = (days: number, closeAt: (i: number) => number, weekdaysOnly: boolean): DailyBar[] => {
  const result: DailyBar[] = [];
  for (let i = 0; i < days; i++) {
    const t = START + i * DAY;
    const weekday = new Date(t).getUTCDay();
    if (weekdaysOnly && (weekday === 0 || weekday === 6)) continue;
    result.push({ openTime: new Date(t), close: new Decimal(closeAt(i)) });
  }
  return result;
};

/** 결정적인 출렁임 — 달력일 i 의 로그 수익 부호를 섞는다 */
const wiggle = (i: number, seed: number) => 100 * Math.exp(0.02 * Math.sin(i * 1.7 + seed) + 0.01 * Math.cos(i * 0.9 + seed * 2));
const NOW = new Date(START + 140 * DAY);
const holding = (symbol: string, assetType: "crypto" | "kr_stock", value = 50) => ({
  symbol,
  assetType,
  value: new Decimal(value),
});

describe("portfolioVolatility", () => {
  it("같이 움직이면 실현 = 상한, 반대로 움직이면 실현 < 상한 · 상관 −1", () => {
    const same = new Map([
      ["A", bars(140, (i) => wiggle(i, 1), true)],
      ["B", bars(140, (i) => wiggle(i, 1), true)],
    ]);
    const v1 = portfolioVolatility([holding("A", "kr_stock"), holding("B", "kr_stock")], same, NOW);
    assert.equal(v1.status, "ok");
    assert.equal(v1.realized?.toFixed(6), v1.upper?.toFixed(6));

    const mirror = new Map([
      ["A", bars(140, (i) => wiggle(i, 1), true)],
      ["B", bars(140, (i) => 10_000 / wiggle(i, 1), true)],
    ]);
    const v2 = portfolioVolatility([holding("A", "kr_stock"), holding("B", "kr_stock")], mirror, NOW);
    assert.ok(v2.realized!.lt(v2.upper!.times(0.01)), "정확히 반대면 50/50 은 거의 0");
    assert.equal(v2.grid, "krx_trading_day");
    assert.equal(v2.periodsPerYear, 252);
  });

  it("국내가 있으면 코인을 그날 09:00 KST 종가(전날 UTC 봉)에 맞추고 주말 변동은 월요일에 쌓는다", () => {
    // 코인 종가 = 달력일 순번 그대로의 출렁임. 국내 종가는 '코인 전날 봉' 과 같게 → as-of 정렬이면 상관 1
    const coin = bars(140, (i) => wiggle(i, 3), false);
    // 국내 첫날은 화요일 — 축 첫날에도 '전날 코인 봉'이 있게(운영은 창보다 넉넉히 읽는다)
    const kr = bars(140, (i) => wiggle(i - 1, 3), true).slice(1);
    const v = portfolioVolatility(
      [holding("BTC", "crypto"), holding("005930", "kr_stock")],
      new Map([
        ["BTC", coin],
        ["005930", kr],
      ]),
      NOW
    );
    assert.equal(v.crossCorrelation?.toFixed(6), "1.000000");
    // 같은 날 봉을 썼다면(하루 어긋남) 상관이 1 보다 작다
    const sameDay = portfolioVolatility(
      [holding("BTC", "crypto"), holding("005930", "kr_stock")],
      new Map([
        ["BTC", coin],
        ["005930", bars(140, (i) => wiggle(i, 3), true).slice(1)],
      ]),
      NOW
    );
    assert.ok(sameDay.crossCorrelation!.lt(0.99));
  });

  it("코인만이면 달력일 축 · √365", () => {
    const v = portfolioVolatility(
      [holding("BTC", "crypto")],
      new Map([["BTC", bars(140, (i) => wiggle(i, 5), false)]]),
      NOW
    );
    assert.equal(v.grid, "calendar_day");
    assert.equal(v.periodsPerYear, 365);
    assert.equal(v.crossCorrelation, null);
    assert.equal(v.realized?.toFixed(8), v.upper?.toFixed(8), "한 종목이면 둘이 같다");
  });

  it("국내 종가 비율 경계 밖인 날은 그 행을 통째로 빼고, 수익률이 60 미만이면 값을 내지 않는다", () => {
    const broken = bars(140, (i) => (i >= 70 ? wiggle(i, 7) * 2 : wiggle(i, 7)), true);
    const v = portfolioVolatility([holding("A", "kr_stock")], new Map([["A", broken]]), NOW);
    const clean = portfolioVolatility(
      [holding("A", "kr_stock")],
      new Map([["A", bars(140, (i) => wiggle(i, 7), true)]]),
      NOW
    );
    assert.equal(v.returns, clean.returns - 1);
    assert.ok(v.realized!.lt(0.6), "2배 점프가 변동성에 들어가지 않는다");

    const short = portfolioVolatility(
      [holding("A", "kr_stock")],
      new Map([["A", bars(50, (i) => wiggle(i, 7), true)]]),
      new Date(START + 50 * DAY)
    );
    assert.equal(short.status, "insufficient_data");
    assert.equal(short.realized, null);
  });

  it("이력이 축을 못 채운 종목은 빠지고 덮은 몫을 알린다", () => {
    const v = portfolioVolatility(
      [holding("A", "kr_stock", 75), holding("NEW", "kr_stock", 25)],
      new Map([
        ["A", bars(140, (i) => wiggle(i, 9), true)],
        ["NEW", bars(140, (i) => wiggle(i, 9), true).slice(60)],
      ]),
      NOW
    );
    assert.deepEqual(v.missingSymbols, ["NEW"]);
    assert.equal(v.coveredWeight?.toNumber(), 0.75);
  });

  it("흔들림 몫(FR-26) — 합 1, 같이 움직이면 비중 그대로, 반대로 움직이는 종목은 음수", () => {
    const same = portfolioVolatility(
      [holding("A", "kr_stock", 75), holding("B", "kr_stock", 25)],
      new Map([
        ["A", bars(140, (i) => wiggle(i, 1), true)],
        ["B", bars(140, (i) => wiggle(i, 1), true)],
      ]),
      NOW
    );
    assert.deepEqual(
      same.contributions.map((c) => [c.symbol, c.share.toFixed(6), c.weight.toFixed(6)]),
      [
        ["A", "0.750000", "0.750000"],
        ["B", "0.250000", "0.250000"],
      ]
    );

    // B 가 A 와 반대로 움직이고 비중이 작으면 B 는 전체 흔들림을 줄인다
    const hedge = portfolioVolatility(
      [holding("A", "kr_stock", 80), holding("B", "kr_stock", 20)],
      new Map([
        ["A", bars(140, (i) => wiggle(i, 1), true)],
        ["B", bars(140, (i) => 10_000 / wiggle(i, 1), true)],
      ]),
      NOW
    );
    const sum = hedge.contributions.reduce((acc, c) => acc + c.share.toNumber(), 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
    assert.equal(hedge.contributions[0].symbol, "A");
    assert.ok(hedge.contributions[1].share.lt(0), "반대로 움직이는 작은 비중은 음수 몫");
  });

  it("나빴던 날 평균(FR-26) — 아래 5% 날 평균 · 금액은 값을 낸 평가금 × 비율 · 가장 나빴던 날", () => {
    const series = bars(140, (i) => wiggle(i, 11), false);
    const v = portfolioVolatility([holding("BTC", "crypto", 1_000_000)], new Map([["BTC", series]]), NOW);
    assert.equal(v.status, "ok");
    const tail = v.tail!;
    assert.equal(tail.fraction, 0.05);
    assert.equal(tail.days, Math.ceil(v.returns * 0.05));

    // 손으로 다시 계산 — 같은 축(달력일) 단순 수익률
    const closes = series.map((bar) => bar.close.toNumber());
    const simple = closes.slice(1).map((close, i) => close / closes[i] - 1).slice(-v.returns);
    const sorted = [...simple].sort((a, b) => a - b);
    const expected = sorted.slice(0, tail.days).reduce((a, b) => a + b, 0) / tail.days;
    assert.ok(Math.abs(tail.averageRate.toNumber() - expected) < 1e-12);
    assert.ok(tail.averageRate.lt(0));
    assert.equal(tail.averageAmount.toKrwInteger(), Math.round(expected * 1_000_000));
    assert.ok(Math.abs(tail.worstRate.toNumber() - sorted[0]) < 1e-12);
    const worstIndex = simple.indexOf(sorted[0]);
    const offset = closes.length - 1 - v.returns;
    assert.equal(tail.worstOn.getTime(), series[offset + worstIndex + 1].openTime.getTime());
  });

  it("값을 못 내면 몫 · 꼬리도 비운다", () => {
    const short = portfolioVolatility(
      [holding("A", "kr_stock")],
      new Map([["A", bars(50, (i) => wiggle(i, 7), true)]]),
      new Date(START + 50 * DAY)
    );
    assert.deepEqual(short.contributions, []);
    assert.equal(short.tail, null);
  });
});
