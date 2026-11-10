import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  backtestKrScalpSymbol,
  backtestUpbitSymbol,
  backtestUsable,
  BACKTEST_DISPLAY_ORIGINS,
  KR_SCALP_LIVE_START,
  UPBIT_SEEN_BEFORE,
  type KrBacktestBar,
} from "../policy";

/** 사전등록 `signal-skill@1` — 본 기간 · 격자 · 만기 · 3종 채움 조건의 경계 */

const DAY = 24 * 3600_000;
const upbitBars = (from: string, count: number, closeOf: (i: number) => number = () => 100): KrBacktestBar[] =>
  Array.from({ length: count }, (_, i) => ({
    at: new Date(new Date(`${from}T00:00:00Z`).getTime() + i * DAY),
    close: closeOf(i),
    volume: 1,
  }));
const rsiOf = (closes: number[]) => (closes.length < 50 ? null : 50);

describe("backtestUpbitSymbol — 업비트 칸", () => {
  it("단타: 마감마다 · 다음 봉 종가 · 본 기간(2026-09-29 전)은 backtest_seen, 뒤는 backtest_price_only", () => {
    const bars = upbitBars("2026-07-01", 100);
    const until = new Date("2026-10-09T00:00:00Z");
    const { samples } = backtestUpbitSymbol({ symbol: "BTC", mode: "scalp", bars, until, rsiOf });
    const seen = samples.filter((s) => s.label === "backtest_seen");
    const shown = samples.filter((s) => s.label === "backtest_price_only");
    assert.ok(seen.every((s) => s.judgedAt < UPBIT_SEEN_BEFORE));
    assert.ok(shown.every((s) => s.judgedAt >= UPBIT_SEEN_BEFORE));
    assert.equal(shown[0].judgedAt.toISOString(), "2026-09-29T00:00:00.000Z");
    // 만기 종가가 실행 시각 뒤면 표본이 아니다
    assert.ok(samples.every((s) => s.evaluatedAt <= until));
    assert.ok(shown.every((s) => s.evaluatedAt.getTime() - s.judgedAt.getTime() === DAY));
  });

  it("봉 60 개 전엔 판단하지 않는다(rule-ic@1 상장 60일)", () => {
    const bars = upbitBars("2026-08-01", 70);
    const { samples } = backtestUpbitSymbol({ symbol: "ETH", mode: "scalp", bars, until: new Date("2026-12-01T00:00:00Z"), rsiOf });
    assert.equal(samples[0].judgedAt.toISOString(), new Date(bars[59].at.getTime() + DAY).toISOString());
  });

  it("장기: 30일 격자 하나 · 30일 뒤 첫 종가 · 항목 전부 재현이라 backtest_full", () => {
    const bars = upbitBars("2026-06-01", 170);
    const { samples } = backtestUpbitSymbol({
      symbol: "SOL",
      mode: "long_term",
      bars,
      until: new Date("2026-11-20T00:00:00Z"),
      rsiOf,
    });
    const shown = samples.filter((s) => s.label !== "backtest_seen");
    assert.ok(shown.length >= 1);
    assert.ok(shown.every((s) => s.label === "backtest_full"));
    for (let k = 1; k < samples.length; k += 1) {
      assert.equal(samples[k].judgedAt.getTime() - samples[k - 1].judgedAt.getTime(), 30 * DAY);
    }
    assert.ok(shown.every((s) => s.evaluatedAt.getTime() - s.judgedAt.getTime() === 30 * DAY));
  });

  it("하루 +5% 면 단타 피하기 — 다음 날 −1% 는 적중(라이브 judgeOutcome 그대로)", () => {
    const bars = upbitBars("2026-07-01", 92, (i) => (i < 90 ? 100 : i === 90 ? 105 : 103.95));
    const { samples } = backtestUpbitSymbol({ symbol: "XRP", mode: "scalp", bars, until: new Date("2026-12-01T00:00:00Z"), rsiOf });
    const jump = samples.find((s) => s.entryPrice === 105)!;
    assert.equal(jump.action, "avoid");
    assert.equal(jump.outcome, "hit");
  });
});

describe("backtestKrScalpSymbol — 국내 단타 칸", () => {
  // 평일 거래일 400 개(2022-01-03 월 ~)
  const sessions: Date[] = [];
  for (let t = new Date("2022-01-02T15:00:00Z").getTime(); sessions.length < 400; t += DAY) {
    const day = new Date(t + 9 * 3600_000).getUTCDay();
    if (day !== 0 && day !== 6) sessions.push(new Date(t));
  }
  const sessionIndex = new Map(sessions.map((at, i) => [at.getTime(), i]));
  const bars: KrBacktestBar[] = sessions.map((at) => ({ at, close: 50_000, volume: 100_000 }));

  it("10 거래일 격자 · 다음 거래일 종가 · 16:00 KST · backtest_price_only", () => {
    const { samples } = backtestKrScalpSymbol({ symbol: "005930", bars, sessions, sessionIndex, costAt: () => 0.0024 });
    assert.ok(samples.length > 0);
    assert.ok(samples.every((s) => s.label === "backtest_price_only" && s.mode === "scalp"));
    for (let k = 1; k < samples.length; k += 1) {
      const a = sessionIndex.get(samples[k - 1].judgedAt.getTime() - 16 * 3600_000)!;
      const b = sessionIndex.get(samples[k].judgedAt.getTime() - 16 * 3600_000)!;
      assert.equal(b - a, 10);
    }
    for (const s of samples) {
      const p = sessionIndex.get(s.judgedAt.getTime() - 16 * 3600_000)!;
      assert.equal(s.evaluatedAt.getTime(), sessions[p + 1].getTime() + 16 * 3600_000);
      assert.ok(s.evaluatedAt < KR_SCALP_LIVE_START);
    }
  });

  it("다음 거래일에 그 종목 봉이 없으면(거래정지) 표본 제외", () => {
    const halted = bars.filter((_, i) => i !== 300);
    const full = backtestKrScalpSymbol({ symbol: "005930", bars, sessions, sessionIndex, costAt: () => 0.0024 });
    const cut = backtestKrScalpSymbol({ symbol: "005930", bars: halted, sessions, sessionIndex, costAt: () => 0.0024 });
    assert.ok(cut.samples.length <= full.samples.length);
    assert.ok(cut.samples.every((s) => s.evaluatedAt.getTime() !== sessions[300].getTime() + 16 * 3600_000));
  });
});

describe("backtestUsable — 3종 채움 조건(signal-skill@1 [display] · kr-judgment-backtest@2)", () => {
  const cases: Array<[string, string, { judgedMonths?: number; judgedDays?: number } | null, boolean]> = [
    ["국내 장기 판단 달 12 → 씀", "kr_stock.long_term.wait", { judgedMonths: 12, judgedDays: 300 }, true],
    ["국내 장기 판단 달 11 → 안 씀(날이 많아도)", "kr_stock.long_term.wait", { judgedMonths: 11, judgedDays: 300 }, false],
    ["국내 단타 판단 날 10 → 씀(달 1)", "kr_stock.scalp.avoid", { judgedMonths: 1, judgedDays: 10 }, true],
    ["코인 장기 판단 날 9 → 안 씀", "long_term.avoid", { judgedMonths: 1, judgedDays: 9 }, false],
    ["코인 단타 판단 날 42 → 씀", "scalp.avoid", { judgedMonths: 2, judgedDays: 42 }, true],
    ["저장소 없음 → 안 씀", "scalp.wait", null, false],
  ];
  for (const [name, signalType, stats, expected] of cases) {
    it(name, () => assert.equal(backtestUsable(signalType, stats), expected));
  }

  it("본 기간 · 옛 라벨은 세지 않는다", () => {
    assert.deepEqual([...BACKTEST_DISPLAY_ORIGINS], ["backtest_full", "backtest_price_only"]);
  });
});
