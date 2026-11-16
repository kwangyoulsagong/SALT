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

const setup = (
  opts: {
    fail?: (code: string, date: string) => boolean;
    coverage?: Map<string, Map<string, { count: number; hasClose: boolean }>>;
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
  return { sync: new SyncKrMinuteBars(kis, store, calendar, universe, () => AT), asked, calendarCalls };
};

describe("SyncKrMinuteBars", () => {
  it("창은 364일 전부터 — 365일 전 날(2025-10-30)은 넣지 않는다", async () => {
    const { sync, asked, calendarCalls } = setup();
    await sync.backfillNight();
    assert.deepEqual(calendarCalls, [{ from: "2025-10-31", to: "2026-10-30" }]);
    assert.ok(!asked.some((a) => a.date === "2025-10-30"));
    assert.ok(asked.some((a) => a.date === "2025-10-31"));
    assert.ok(asked.some((a) => a.date === "2026-10-30"));
  });

  it("회차 상한 — 장 마감 회차 1,200 호출(종목·일 300) · 밤 백필 회차 2만, 최신 날부터", async () => {
    const day = await setup().sync.execute();
    assert.equal(day.days, 300);
    const { sync, asked } = setup();
    const night = await sync.backfillNight();
    assert.equal(night.remaining, 0); // 2종목 × 1년 개장일 ≈ 520 — 밤 회차 하나로 끝난다
    assert.equal(asked[0]?.date, "2026-10-30");
  });

  it("남은 = 못 고른 것 + 실패한 것 — 실패가 있으면 0 이 아니다", async () => {
    const { sync } = setup({ fail: (code, date) => code === "000660" && date === "2026-10-29" });
    const r = await sync.backfillNight();
    assert.equal(r.failed, 1);
    assert.equal(r.remaining, 1);
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
