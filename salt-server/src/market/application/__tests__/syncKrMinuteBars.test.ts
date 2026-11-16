import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { KrMarketCalendarStore, KrStockQuotePort, KrStockStore } from "../../domain";
import { SyncKrMinuteBars, type ResolveKrStockUniverse } from "../SyncKrStock";

/**
 * 5분봉 장 마감 보정 · 백필(SRV-REQ-040 FR-21) — 창은 1년(2026-11-16, 국내 5분봉 보관 400일 · 장중 기저율 FC-REQ-028 FR-7).
 * 2026-11-02: 창이 보관 끝 날을 넣어 회차마다 전 종목을 다시 받고 정리가 다시 지우고 있었다 — 끝 날은 넣지 않는 모양을 유지한다.
 */

// 2026-10-30(금) 15:40 KST
const AT = new Date("2026-10-30T06:40:00Z");
/** 같은 날 16:15 KST — 큰 백필이 도는 장 마감 뒤 회차(시세 창 밖) */
const AFTER_CLOSE = new Date("2026-10-30T07:15:00Z");

const setup = (
  opts: {
    fail?: (code: string, date: string) => boolean;
    coverage?: Map<string, Map<string, { count: number; hasClose: boolean }>>;
    clock?: () => Date;
  } = {}
) => {
  const asked: Array<{ code: string; date: string }> = [];
  const calendarCalls: Array<{ from: string; to: string }> = [];
  const kis = {
    dayMinuteCandles: async (code: string, date: string) => {
      if (opts.fail?.(code, date)) throw new Error("EGW00201");
      asked.push({ code, date });
      return [];
    },
  } as unknown as KrStockQuotePort;
  const store = {
    minuteBarCoverage: async () => opts.coverage ?? new Map(),
    replaceMinuteCandles: async () => {},
  } as unknown as KrStockStore;
  const calendar = {
    // 평일은 전부 개장 — 창 경계만 본다
    days: async (from: string, to: string) => {
      calendarCalls.push({ from, to });
      const out = [];
      for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
        const d = new Date(t);
        out.push({ date: d.toISOString().slice(0, 10), isOpen: d.getUTCDay() !== 0 && d.getUTCDay() !== 6 });
      }
      return out;
    },
  } as unknown as KrMarketCalendarStore;
  const universe = { execute: async () => ["005930", "000660"] } as unknown as ResolveKrStockUniverse;
  return { sync: new SyncKrMinuteBars(kis, store, calendar, universe, opts.clock ?? (() => AT)), asked, calendarCalls };
};

describe("SyncKrMinuteBars", () => {
  it("창은 364일 전부터 — 365일 전 날(2025-10-30)은 넣지 않는다", async () => {
    const { sync, asked, calendarCalls } = setup({ clock: () => AFTER_CLOSE });
    await sync.backfillOffHours();
    // 앞 한 번은 시세 창 판정용 달력
    assert.deepEqual(calendarCalls.at(-1), { from: "2025-10-31", to: "2026-10-30" });
    assert.ok(!asked.some((a) => a.date === "2025-10-30"));
    assert.ok(asked.some((a) => a.date === "2025-10-31"));
    assert.ok(asked.some((a) => a.date === "2026-10-30"));
  });

  it("회차 상한 — 장 마감 회차 1,200 호출(종목·일 300) · 큰 백필 회차 2만, 최신 날부터", async () => {
    const day = await setup().sync.execute();
    assert.equal(day.days, 300);
    const { sync, asked } = setup({ clock: () => AFTER_CLOSE });
    const night = await sync.backfillOffHours();
    assert.equal(night.skipped, false);
    if (!night.skipped) assert.equal(night.remaining, 0); // 2종목 × 1년 개장일 ≈ 520 — 회차 하나로 끝난다
    assert.equal(asked[0]?.date, "2026-10-30");
  });

  it("남은 = 못 고른 것 + 실패한 것 — 실패가 있으면 0 이 아니다", async () => {
    const { sync } = setup({ fail: (code, date) => code === "000660" && date === "2026-10-29", clock: () => AFTER_CLOSE });
    const r = await sync.backfillOffHours();
    assert.equal(r.skipped, false);
    if (!r.skipped) {
      assert.equal(r.failed, 1);
      assert.equal(r.remaining, 1);
    }
  });

  it("큰 백필은 시세 창(개장일 08:30~16:00)에 불리면 KIS 호출 0 — 08:30 · 15:40 · 15:59 거절, 08:29 · 16:00 허용", async () => {
    // 금요일 KST
    const cases: Array<[string, boolean]> = [
      ["2026-10-29T23:29:00Z", true], // 08:29
      ["2026-10-29T23:30:00Z", false], // 08:30
      ["2026-10-30T06:40:00Z", false], // 15:40 — 장 마감 보정(execute)은 이 시각에 돈다, 큰 백필만 거절
      ["2026-10-30T06:59:00Z", false], // 15:59
      ["2026-10-30T07:00:00Z", true], // 16:00
      ["2026-10-31T01:00:00Z", true], // 토요일 10:00
    ];
    for (const [at, allowed] of cases) {
      const { sync, asked } = setup({ clock: () => new Date(at) });
      const r = await sync.backfillOffHours();
      assert.equal(r.skipped, !allowed, at);
      assert.equal(asked.length > 0, allowed, at);
    }
  });

  it("큰 백필 도중 잠들었다 시세 창 안에서 깨면 새 종목·일을 고르지 않는다", async () => {
    let calls = 0;
    // 첫 KIS 호출 뒤 시계가 월요일 09:00 KST 로 뛴다(주말 내내 잠)
    const { sync, asked } = setup({ clock: () => (calls > 0 ? new Date("2026-11-02T00:00:00Z") : AFTER_CLOSE) });
    const origin = (sync as unknown as { kis: { dayMinuteCandles: (...a: unknown[]) => Promise<unknown[]> } }).kis;
    const inner = origin.dayMinuteCandles;
    origin.dayMinuteCandles = async (...a: unknown[]) => {
      calls++;
      return inner(...a);
    };
    const r = await sync.backfillOffHours();
    assert.equal(r.skipped, false);
    if (!r.skipped) {
      assert.equal(r.stopped, true);
      assert.ok(r.remaining > 0);
    }
    // 동시 6개가 같은 순간 출발했을 수 있다 — 그 뒤로 새로 고른 일은 0
    assert.ok(asked.length <= 6, `호출 ${asked.length}`);
  });

  it("종가 봉 없는 날은 최근 개장일 5일까지만 다시 받는다 — KIS 에 종가 1분봉이 없는 날을 30일 내내 받지 않는다", async () => {
    const full = (hasClose: boolean) => ({ count: 76, hasClose });
    const byDate = new Map<string, { count: number; hasClose: boolean }>();
    for (let t = Date.parse("2026-10-01T00:00:00Z"); t <= Date.parse("2026-10-29T00:00:00Z"); t += 86_400_000) {
      byDate.set(new Date(t).toISOString().slice(0, 10), full(true));
    }
    byDate.set("2026-10-08", full(false)); // 오래된 날 — KIS 에 종가 없음
    byDate.set("2026-10-27", full(false)); // 최근 5개장일(10-30 · 29 · 28 · 27 · 26) 안
    const coverage = new Map([["005930", byDate], ["000660", byDate]]);
    const { sync, asked } = setup({ coverage });
    await sync.execute();
    // 10월은 봉이 다 있다 — 다시 받는 건 오늘과 최근 5개장일 안 종가 빠진 날뿐(그 앞 빈 날은 1년 백필 몫)
    const dates = [...new Set(asked.map((a) => a.date))].filter((d) => d >= "2026-10-01").sort();
    assert.deepEqual(dates, ["2026-10-27", "2026-10-30"]);
  });
});
