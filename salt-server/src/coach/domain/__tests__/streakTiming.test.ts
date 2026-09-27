import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { hasEnteredTime, kstWeekday, streakMirror, tradeTimingMirror, type CoachLedgerEntry } from "..";

/**
 * F009 슬라이스 7 (`SRV-REQ-038` FR-12) — 연승 · 연패(FR-20) · 시간대 · 요일(FR-22)을 손계산과 대조한다.
 */

const at = (iso: string) => new Date(iso);

const closed = (iso: string, pnl: number, id = iso) => ({
  closedAt: at(iso),
  closingTransactionId: id,
  netPnlKrw: new Decimal(pnl),
});

const buy = (iso: string, amount: number): Pick<CoachLedgerEntry, "side" | "totalAmount" | "transactionDate"> => ({
  side: "buy",
  totalAmount: amount,
  transactionDate: at(iso),
});

const day = (n: number, hour = 12) => new Date(Date.UTC(2026, 0, 1, hour) + n * 86_400_000).toISOString();

describe("streakMirror (FR-20)", () => {
  it("지금 이어지는 연속과 최장 연승 · 연패를 센다 — 순서는 청산 시각", () => {
    const streak = streakMirror(
      [
        closed(day(5), 100),
        closed(day(1), -10),
        closed(day(2), -10),
        closed(day(3), 50),
        closed(day(4), 50),
      ],
      null
    );
    assert.deepEqual(streak.current, { kind: "win", length: 3 });
    assert.equal(streak.longestWin, 3);
    assert.equal(streak.longestLoss, 2);
    assert.equal(streak.sampleSize, 5);
    assert.equal(streak.afterWins, null, "원장이 없으면 사이즈 비교를 하지 않는다");
  });

  it("순손익 0 청산은 연속을 끊는다 — 마지막이 0 이면 지금 연속이 없다", () => {
    const streak = streakMirror([closed(day(1), 10), closed(day(2), 10), closed(day(3), 0)], null);
    assert.equal(streak.current, null);
    assert.equal(streak.longestWin, 2);
  });

  it("청산이 없으면 연속도 없다", () => {
    const streak = streakMirror([], []);
    assert.equal(streak.current, null);
    assert.equal(streak.afterWins?.ratio.status, "insufficient_data");
    assert.equal(streak.afterWins?.observed, false);
  });

  it("3연승 뒤 매수 금액 ÷ 그 밖의 매수 — 매수 **전에** 닫힌 청산만 상태에 넣는다", () => {
    const outcomes = [closed(day(1), 10), closed(day(2), 10), closed(day(3), 10)];
    const buys = [
      buy(day(0), 100), // 연속 없음
      buy(day(2, 13), 100), // 2연승 — 아직 아니다
      buy(day(3), 300), // 같은 시각 청산은 아직 닫히지 않았다 — 2연승
      buy(day(4), 300), // 3연승 뒤
    ];
    const streak = streakMirror(outcomes, buys);
    // 연속 뒤 [300] · 그 밖 [100, 100, 300] 평균 500/3 → 300 ÷ 166.67 = 1.8
    assert.equal(streak.afterWins?.ratio.value?.toFixed(4), "1.8000");
    assert.equal(streak.afterWins?.ratio.sampleSize, 1);
    assert.equal(streak.afterWins?.ratio.status, "insufficient_sample");
    assert.equal(streak.afterWins?.observed, false, "표본 < 20 이면 관찰로 치지 않는다");
    assert.equal(streak.afterLosses?.ratio.value, null);
  });

  it("연승 뒤 매수가 20건 이상이고 1.2배 이상이면 관찰된 패턴이다", () => {
    const outcomes = [closed(day(1), 10), closed(day(2), 10), closed(day(3), 10)];
    const buys = [
      ...Array.from({ length: 10 }, (_, i) => buy(day(0, i), 100)),
      ...Array.from({ length: 20 }, (_, i) => buy(day(4, i), 130)),
    ];
    const streak = streakMirror(outcomes, buys);
    assert.equal(streak.afterWins?.ratio.value?.toFixed(2), "1.30");
    assert.equal(streak.afterWins?.ratio.status, "ok");
    assert.equal(streak.afterWins?.observed, true);

    const flat = streakMirror(outcomes, [
      ...Array.from({ length: 10 }, (_, i) => buy(day(0, i), 100)),
      ...Array.from({ length: 20 }, (_, i) => buy(day(4, i), 110)),
    ]);
    assert.equal(flat.afterWins?.observed, false, "1.1배는 커졌다고 보지 않는다");
  });

  it("매도 기록은 사이즈 비교에 넣지 않는다", () => {
    const streak = streakMirror([], [{ side: "sell", totalAmount: 999, transactionDate: at(day(1)) }]);
    assert.equal(streak.afterWins?.ratio.sampleSize, 0);
  });
});

describe("tradeTimingMirror (FR-22)", () => {
  const outcome = (openedAt: string, pnl: number, ret: string) => ({
    openedAt: at(openedAt),
    netPnlKrw: new Decimal(pnl),
    netReturn: new Decimal(ret),
  });

  it("KST 0시 정각은 날짜만 적은 진입이다", () => {
    assert.equal(hasEnteredTime(at("2026-01-04T15:00:00.000Z")), false); // KST 01-05 00:00
    assert.equal(hasEnteredTime(at("2026-01-04T15:00:00.001Z")), true);
    assert.equal(hasEnteredTime(at("2026-01-05T00:00:00.000Z")), true); // KST 09:00
  });

  it("요일은 KST 로 가른다 — UTC 일요일 16시는 KST 월요일", () => {
    assert.equal(kstWeekday(at("2026-01-04T16:00:00Z")), "mon");
    assert.equal(kstWeekday(at("2026-01-04T14:59:59Z")), "sun");
  });

  it("시각이 있는 진입만 시간대에 묶고, 요일은 전부 센다", () => {
    const timing = tradeTimingMirror([
      outcome("2026-01-04T17:30:00Z", 100, "0.10"), // KST 월 02:30 — 새벽
      outcome("2026-01-04T18:00:00Z", -50, "-0.05"), // KST 월 03:00 — 새벽
      outcome("2026-01-05T03:00:00Z", 30, "0.03"), // KST 월 12:00 — 오후
      outcome("2026-01-05T15:00:00Z", 20, "0.02"), // KST 화 00:00 정각 — 시각 없음
    ]);
    assert.equal(timing.timedCount, 3);
    assert.equal(timing.untimedCount, 1);

    const dawn = timing.bands!.find((band) => band.key === "dawn")!;
    assert.equal(dawn.count, 2);
    assert.equal(dawn.winRate?.toFixed(2), "0.50");
    assert.equal(dawn.avgReturn?.toFixed(3), "0.025");
    assert.equal(dawn.netPnlKrw.toNumber(), 50);
    assert.equal(dawn.status, "insufficient_sample");

    assert.equal(timing.bands!.find((band) => band.key === "afternoon")!.count, 1);
    const morning = timing.bands!.find((band) => band.key === "morning")!;
    assert.equal(morning.count, 0);
    assert.equal(morning.winRate, null);
    assert.equal(morning.status, "insufficient_data");

    assert.equal(timing.weekdays.find((d) => d.key === "mon")!.count, 3);
    assert.equal(timing.weekdays.find((d) => d.key === "tue")!.count, 1);
    assert.equal(timing.weekdays.length, 7);
  });

  it("시각 있는 진입이 하나도 없으면 시간대 섹션이 없다", () => {
    const timing = tradeTimingMirror([outcome("2026-01-05T15:00:00Z", 20, "0.02")]);
    assert.equal(timing.bands, null);
    assert.equal(timing.weekdays.find((d) => d.key === "tue")!.count, 1);
  });

  it("표본 20 이상인 구간은 ok", () => {
    const timing = tradeTimingMirror(
      Array.from({ length: 20 }, (_, i) => outcome(`2026-01-${String(5 + (i % 7)).padStart(2, "0")}T01:00:00Z`, 10, "0.01"))
    );
    assert.equal(timing.bands!.find((band) => band.key === "morning")!.status, "ok");
  });
});
