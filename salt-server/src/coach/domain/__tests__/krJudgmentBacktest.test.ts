import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  backtestKrSymbol,
  isKrBacktestEligible,
  krBacktestExcessInterval,
  krBacktestOffsetDays,
  krBacktestPlacebo,
  seededRandom,
  summarizeKrBacktest,
  type KrBacktestBar,
  type KrBacktestSample,
} from "../policy";

/**
 * 국내 판단 백테스트 (사전등록 `kr-judgment-backtest@1`). 합성 일봉 — 평일만, 거래대금은 하한(10억) 위
 */

const DAY = 86_400_000;
/** 평일 거래일 n 개(2021-10-11 월요일부터), 거래일 00:00 KST */
const weekdays = (n: number): Date[] => {
  const out: Date[] = [];
  let at = new Date("2021-10-11T00:00:00+09:00").getTime();
  while (out.length < n) {
    const day = new Date(at + 9 * 3600_000).getUTCDay();
    if (day !== 0 && day !== 6) out.push(new Date(at));
    at += DAY;
  }
  return out;
};

const sessions = weekdays(1_300);
const sessionIndex = new Map(sessions.map((at, i) => [at.getTime(), i]));
/** 종가 100 근처에서 천천히 흔들리는 수열 — 끊김 없음 */
const bars = (closeAt: (i: number) => number = (i) => 100 + 5 * Math.sin(i / 7), volume = 20_000_000): KrBacktestBar[] =>
  sessions.map((at, i) => ({ at, close: closeAt(i), volume }));
const rsiOf = (closes: number[]) => (closes.length < 50 ? null : 50);
const run = (input: Partial<Parameters<typeof backtestKrSymbol>[0]> = {}) =>
  backtestKrSymbol({
    symbol: "005930",
    bars: bars(),
    sessionIndex,
    liveStart: new Date("2026-10-08T00:00:00+09:00"),
    cost: 0.0023,
    rsiOf,
    ...input,
  });

describe("kr-universe@1 — 시점 고정 대상", () => {
  it("봉 250 · 최근 20 거래일 빈칸 없음 · 평균 거래대금 10억 이상", () => {
    const series = bars();
    assert.equal(isKrBacktestEligible(series, 248, sessionIndex), false); // 봉 249
    assert.equal(isKrBacktestEligible(series, 249, sessionIndex), true);
    // 거래대금 100 × 900만 = 9억 → 미달
    assert.equal(isKrBacktestEligible(bars(undefined, 9_000_000), 300, sessionIndex), false);
    // 최근 20일 사이 하루가 빠진 종목 → 미달
    const gapped = series.filter((_, i) => i !== 295);
    assert.equal(isKrBacktestEligible(gapped, 299, sessionIndex), false);
    // 거래량 모름 → 미달(0 으로 채우지 않는다)
    const unknown = series.map((bar, i) => (i === 290 ? { ...bar, volume: null } : bar));
    assert.equal(isKrBacktestEligible(unknown, 299, sessionIndex), false);
  });
});

describe("backtestKrSymbol — 같은 규칙 · 30일 간격 · 라이브 전 만기", () => {
  it("판단은 30일 이상 떨어지고 만기가 라이브 시작 전이다", () => {
    const { samples } = run();
    assert.ok(samples.length > 30);
    for (let k = 1; k < samples.length; k += 1) {
      assert.ok(samples[k].judgedAt.getTime() - samples[k - 1].judgedAt.getTime() >= 30 * DAY);
    }
    const last = samples[samples.length - 1];
    assert.ok(last.judgedAt.getTime() + 30 * DAY < new Date("2026-10-08T00:00:00+09:00").getTime());
    // 판단 시각 = 거래일 16:00 KST, 첫 판단은 창 시작 + 종목 오프셋 이후
    assert.equal(new Date(last.judgedAt.getTime() + 9 * 3600_000).getUTCHours(), 16);
    assert.ok(samples[0].judgedAt.getTime() >= new Date("2022-01-01T00:00:00+09:00").getTime() + krBacktestOffsetDays("005930") * DAY);
  });

  it("점수 규칙은 운영 코드 그대로 — 하루 3% 넘게 내리고 RSI 35 이하면 관망(점수 64) + 근거 두 줄", () => {
    // 매 30번째 거래일에 −5% 하락 → 판단일과 겹치는 날이 생긴다
    const series = bars((i) => (i % 2 === 0 ? 100 : 94));
    const { samples } = run({ bars: series, rsiOf: (closes) => (closes.length < 50 ? null : 30) });
    const down = samples.find((sample) => sample.entryPrice === 94);
    assert.ok(down);
    assert.equal(down.action, "wait");
    assert.equal(down.score, 64);
    assert.equal(down.reasons.length, 2);
    const up = samples.find((sample) => sample.entryPrice === 100);
    assert.ok(up);
    assert.equal(up.score, 52); // +6.4% 하루 상승 −6 · RSI 30 +8
  });

  it("RSI 70 이상이면 피하기 — 만기 수익률이 비용 이하면 적중", () => {
    const { samples } = run({ rsiOf: (closes) => (closes.length < 50 ? null : 75) });
    assert.ok(samples.every((sample) => sample.action === "avoid"));
    for (const sample of samples) {
      assert.equal(sample.outcome, sample.returnRate <= 0.0023 ? "hit" : "miss");
      assert.ok(Math.abs(sample.returnRate - (sample.exitPrice / sample.entryPrice - 1)) < 1e-12);
    }
  });

  it("창 안에 원천 끊김(종가 ×0.05 · ×1.5)이 있으면 그 판단을 뺀다", () => {
    const clean = run().samples.length;
    const series = bars((i) => (i >= 700 ? 5 : 100));
    const broken = run({ bars: series });
    assert.ok(broken.droppedBreaks >= 1);
    assert.ok(broken.samples.length < clean);
    assert.ok(broken.samples.every((sample) => sample.entryPrice === 5 || sample.exitPrice === 100));
  });
});

const sample = (action: KrBacktestSample["action"], returnRate: number, day: string): KrBacktestSample => ({
  symbol: "X",
  judgedAt: new Date(`${day}T16:00:00+09:00`),
  action,
  score: 50,
  reasons: [],
  entryPrice: 100,
  exitPrice: 100 * (1 + returnRate),
  returnRate,
  outcome: action === "avoid" ? (returnRate <= 0.0023 ? "hit" : "miss") : Math.abs(returnRate) <= 0.1 ? "hit" : "miss",
  evaluatedAt: new Date(`${day}T16:00:00+09:00`),
});

describe("재검증 통계 — 기저율은 행동 무관 풀", () => {
  // 풀 8건 중 오름 4 → 항상 오른다 0.5. 피하기 4건 중 안 오름 3 → 적중 0.75, 기저율 1 − 0.5, 초과 +0.25
  const samples = [
    sample("avoid", -0.05, "2023-01-10"),
    sample("avoid", -0.02, "2023-01-10"),
    sample("avoid", -0.01, "2023-02-10"),
    sample("avoid", 0.04, "2023-02-10"),
    sample("wait", 0.03, "2023-01-10"),
    sample("wait", 0.05, "2023-01-10"),
    sample("wait", 0.02, "2023-02-10"),
    sample("wait", -0.03, "2023-02-10"),
  ];

  it("그룹 표 — 초과 적중률은 풀 기저율 대비, 관망은 없음", () => {
    const [avoid, wait] = summarizeKrBacktest(samples, 0.0023);
    assert.equal(avoid.action, "avoid");
    assert.equal(avoid.hitRate, 0.75);
    assert.equal(avoid.naiveHitRate, 0.5);
    assert.equal(avoid.excess, 0.25);
    assert.equal(avoid.months, 2);
    assert.equal(wait.excess, null);
  });

  it("블록 부트스트랩 · 플라시보는 시드가 같으면 같고, 관망은 없다", () => {
    const a = krBacktestExcessInterval(samples, "avoid", 0.0023, 200, seededRandom(1));
    const b = krBacktestExcessInterval(samples, "avoid", 0.0023, 200, seededRandom(1));
    assert.deepEqual(a, b);
    assert.ok(a && a.low <= 0.25 && a.high >= 0.25);
    assert.equal(krBacktestExcessInterval(samples, "wait", 0.0023, 10, seededRandom(1)), null);
    const placebo = krBacktestPlacebo(samples, "avoid", 0.0023, 200, seededRandom(2));
    assert.ok(placebo);
    assert.equal(placebo.observed, 0.25);
    assert.ok(placebo.p > 0 && placebo.p <= 1);
  });
});
