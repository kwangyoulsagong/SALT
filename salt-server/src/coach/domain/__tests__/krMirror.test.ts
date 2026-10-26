import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import type { CoachLedgerEntry, DailyBar, KrReturnProfile } from "..";
import {
  chaseMirror,
  dispositionMirror,
  isLotteryStock,
  krClosingHoldings,
  krTradingDays,
  krTurnoverMirror,
  lotteryCutoffs,
  lotteryMirror,
  lotteryWindowFor,
  nextDaySellMirror,
  replayLedger,
  sortLedgerAscending,
  toKrTradingClock,
} from "../policy";

/**
 * F011 FR-47 국내 행동 미러 — 거래일 창 · KST 날짜 · 다음 거래일 매도율 · 40거래일 추격 · 복권형 단면.
 */

const DAY = 24 * 60 * 60 * 1000;

/** `from` 부터 평일만 `count` 개 — 종가는 `closeAt(i)` */
const weekdayBars = (from: string, count: number, closeAt: (i: number) => number): DailyBar[] => {
  const bars: DailyBar[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); bars.length < count; t += DAY) {
    const weekday = new Date(t).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    bars.push({ openTime: new Date(t), close: new Decimal(closeAt(bars.length)) });
  }
  return bars;
};

/** 화면이 지난 날짜 거래를 저장하는 모양 — 그날 00:00 KST */
const kstDate = (date: string) => new Date(`${date}T00:00:00+09:00`);

const tx = (
  id: string,
  side: "buy" | "sell",
  at: Date,
  price: number,
  quantity = 1,
  symbol = "005930"
): CoachLedgerEntry => ({
  id,
  symbol,
  side,
  quantity,
  price,
  totalAmount: price * quantity,
  fee: 0,
  transactionDate: at,
});

const prepare = (entries: CoachLedgerEntry[]) => sortLedgerAscending(toKrTradingClock(entries));

describe("toKrTradingClock", () => {
  it("00:00 KST 로 적은 거래가 UTC 전날이 아니라 그 거래일 봉에 붙는다", () => {
    // 2026-10-05(월) 00:00 KST = 10-04 15:00 UTC — UTC 날짜로 붙이면 일요일이 된다
    const bars = weekdayBars("2026-10-01", 6, (i) => 100 + i);
    const [buy] = prepare([tx("b1", "buy", kstDate("2026-10-05"), 100)]);
    assert.equal(buy.transactionDate.toISOString().slice(0, 10), "2026-10-05");
    const sell = prepare([tx("b1", "buy", kstDate("2026-10-02"), 100), tx("s1", "sell", kstDate("2026-10-05"), 110)]);
    const holdings = krClosingHoldings(replayLedger(sell), new Map([["005930", bars]]));
    assert.equal(holdings[0].holdingDays.toNumber(), 1, "금(10-02) 매수 → 월(10-05) 매도 = 1거래일(주말 제외)");
  });
});

describe("krTurnoverMirror", () => {
  it("주말은 날이 아니고, 토요일에 적은 거래는 다음 거래일 몫이다", () => {
    const bars = weekdayBars("2026-09-01", 30, () => 100);
    const entries = prepare([
      tx("b1", "buy", kstDate("2026-09-01"), 100, 10),
      tx("s1", "sell", kstDate("2026-09-05"), 100, 5), // 토요일
    ]);
    const tradingDays = krTradingDays(new Map([["005930", bars]]));
    const mirror = krTurnoverMirror(entries, new Map([["005930", bars]]), tradingDays, new Date("2026-10-13T08:00:00Z"));
    // 보유 거래일 30일: 첫 4일 1,000원, 그 뒤 26일 500원 → 합 17,000. 대금 1,500 ÷ 2 ÷ 17,000
    assert.equal(mirror.dailyTurnover.sampleSize, 30);
    assert.equal(mirror.dailyTurnover.value?.toFixed(6), new Decimal(750).div(17_000).toFixed(6));
    assert.equal(mirror.dailyTurnover.status, "ok");
    assert.equal(mirror.tradeCount, 2);
  });

  it("거래가 없으면 값이 없다 — 0 으로 채우지 않는다", () => {
    const mirror = krTurnoverMirror([], new Map(), new Set(), new Date("2026-10-13T08:00:00Z"));
    assert.equal(mirror.dailyTurnover.value, null);
    assert.equal(mirror.dailyTurnover.status, "insufficient_data");
  });
});

describe("dispositionMirror · carryForward", () => {
  it("휴장일 매도도 직전 거래일 종가로 다른 보유의 장부상 손익을 가른다", () => {
    const bars = new Map([
      ["005930", weekdayBars("2026-09-01", 10, () => 100)],
      ["000660", weekdayBars("2026-09-01", 10, () => 80)],
    ]);
    const entries = prepare([
      tx("b1", "buy", kstDate("2026-09-01"), 90),
      tx("b2", "buy", kstDate("2026-09-01"), 100, 1, "000660"),
      tx("s1", "sell", kstDate("2026-09-05"), 100), // 토요일
    ]);
    const replay = replayLedger(entries);
    const exact = dispositionMirror(replay, bars, []);
    assert.deepEqual(exact.missingCloses, ["000660"], "그날 봉만 보면 결측");
    const carried = dispositionMirror(replay, bars, krClosingHoldings(replay, bars), { carryForward: true });
    assert.deepEqual(carried.counts, { realizedGains: 1, paperGains: 0, realizedLosses: 0, paperLosses: 1 });
    assert.equal(carried.pgr.value?.toNumber(), 1);
    assert.equal(carried.plr.value?.toNumber(), 0);
  });
});

describe("nextDaySellMirror", () => {
  it("다음 거래일 이익 · 손실을 가르고 그날 판 것만 센다 · 당일 매매는 빠진다", () => {
    const bars = new Map([
      ["005930", weekdayBars("2026-09-01", 10, (i) => (i === 1 ? 110 : 95))],
      ["000660", weekdayBars("2026-09-01", 10, () => 95)],
    ]);
    const entries = prepare([
      // 09-01 매수 → 09-02(종가 110) 이익 · 그날 팜
      tx("b1", "buy", kstDate("2026-09-01"), 100),
      tx("s1", "sell", kstDate("2026-09-02"), 108),
      // 09-02 매수 → 09-03(종가 95) 손실 · 안 팜
      tx("b2", "buy", kstDate("2026-09-02"), 100),
      // 09-04 사서 그날 다 팜 — 당일 매매(다른 종목 — 같은 종목이면 선입선출로 b2 를 판다)
      tx("b3", "buy", kstDate("2026-09-04"), 100, 1, "000660"),
      tx("s3", "sell", kstDate("2026-09-04"), 101, 1, "000660"),
    ]);
    const mirror = nextDaySellMirror(replayLedger(entries), bars);
    assert.deepEqual(mirror.counts, { gainPositions: 1, gainSold: 1, lossPositions: 1, lossSold: 0 });
    assert.equal(mirror.gainSellRate.value?.toNumber(), 1);
    assert.equal(mirror.lossSellRate.value?.toNumber(), 0);
    assert.equal(mirror.gainSellRate.status, "insufficient_sample");
  });
});

describe("chaseMirror", () => {
  it("매수 전 거래일 종가 ÷ 40거래일 앞 종가 − 1 · 봉 부족 · 원천 끊김은 표본이 아니다", () => {
    const rising = weekdayBars("2026-07-01", 60, (i) => 100 + i);
    const broken = weekdayBars("2026-07-01", 60, (i) => (i === 50 ? 200 : 100));
    const bars = new Map([
      ["005930", rising],
      ["000660", broken],
    ]);
    const buyAt = rising[45].openTime; // 그 전 거래일 = 44번 봉, 40거래일 앞 = 4번 봉
    const buys = [
      tx("b1", "buy", buyAt, 1),
      tx("b2", "buy", rising[10].openTime, 1), // 앞 봉 10개
      tx("b3", "buy", broken[55].openTime, 1, 1, "000660"),
    ];
    const mirror = chaseMirror(buys, bars);
    assert.deepEqual(mirror.counts, { measured: 1, shortHistory: 1, breaks: 1 });
    assert.equal(mirror.avgPriorReturn.value?.toFixed(6), new Decimal(144).div(104).minus(1).toFixed(6));
    assert.equal(mirror.windowTradingDays, 40);
  });
});

describe("복권형", () => {
  const profile = (symbol: string, lastClose: number, volatility: number, skewness: number): KrReturnProfile => ({
    symbol,
    lastClose,
    returns: 120,
    volatility,
    skewness,
  });
  const section = [
    profile("A", 1_000, 0.05, 1.5), // 싸고 · 출렁이고 · 오른 꼬리 → 복권형
    profile("B", 50_000, 0.01, -0.2),
    profile("C", 2_000, 0.04, 0.1),
    profile("D", 80_000, 0.02, 0.8),
    profile("E", 30_000, 0.03, 0.4),
  ];

  it("단면 중앙값 셋을 다 넘어야 복권형이다", () => {
    const cutoffs = lotteryCutoffs(section)!;
    assert.deepEqual([cutoffs.price, cutoffs.volatility, cutoffs.skewness], [30_000, 0.03, 0.4]);
    assert.equal(isLotteryStock(section[0], cutoffs), true);
    assert.equal(isLotteryStock(section[2], cutoffs), false, "왜도가 중앙값 아래");
    assert.equal(cutoffs.marketShare, 0.2);
  });

  it("매수 대금 몫 · 단면에 없는 종목은 분모 밖 · 구간은 매수 달 1일 KST 앞 6개월", () => {
    const [buyA, buyD, buyX] = prepare([
      tx("b1", "buy", kstDate("2026-10-05"), 1_000, 30, "A"),
      tx("b2", "buy", kstDate("2026-10-06"), 70_000, 1, "D"),
      tx("b3", "buy", kstDate("2026-10-07"), 5_000, 1, "X"),
    ]);
    const window = lotteryWindowFor(buyA.transactionDate);
    assert.equal(window.to.toISOString(), "2026-09-30T15:00:00.000Z");
    assert.equal(window.from.toISOString(), "2026-03-31T15:00:00.000Z");
    const mirror = lotteryMirror([buyA, buyD, buyX], new Map([[window.key, section]]));
    assert.deepEqual(mirror.counts, { lotteryBuys: 1, judgedBuys: 2, unknownBuys: 1 });
    assert.equal(mirror.buyShare.value?.toNumber(), 0.3);
    assert.equal(mirror.marketShare?.toNumber(), 0.2);
  });
});
