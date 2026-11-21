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
    coverage?: Map<string, Map<string, { count: number; lastMinute: number }>>;
    clock?: () => Date;
    /** 평일 휴장(달력에 isOpen=false) — 새해 첫 개장일 판정용 */
    closed?: string[];
    /** KIS 가 돌려줄 1분봉(종목 · 날 · 커서) — 없으면 빈 쪽 */
    minutes?: (code: string, date: string, hhmmss: string) => Array<{ timestamp: Date; open: number; high: number; low: number; close: number; volume: number }>;
  } = {}
) => {
  const asked: Array<{ code: string; date: string; history?: string; hhmmss: string }> = [];
  const pruned: Array<{ code: string; date: string; hours: { open: number; close: number } }> = [];
  const calendarCalls: Array<{ from: string; to: string }> = [];
  const kis = {
    dayMinuteCandles: async (code: string, date: string, hhmmss: string, o: { history?: string } = {}) => {
      if (opts.fail?.(code, date)) throw new Error("EGW00201");
      asked.push({ code, date, history: o.history, hhmmss });
      return opts.minutes?.(code, date, hhmmss) ?? [];
    },
  } as unknown as KrStockQuotePort;
  const store = {
    minuteBarCoverage: async () => opts.coverage ?? new Map(),
    replaceMinuteCandles: async () => {},
    pruneMinuteCandlesOutside: async (code: string, date: string, hours: { open: number; close: number }) => {
      pruned.push({ code, date, hours });
    },
  } as unknown as KrStockStore;
  const calendar = {
    // 평일은 전부 개장 — 창 경계만 본다
    days: async (from: string, to: string) => {
      calendarCalls.push({ from, to });
      const out = [];
      for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
        const d = new Date(t);
        const date = d.toISOString().slice(0, 10);
        out.push({ date, isOpen: d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !opts.closed?.includes(date) });
      }
      return out;
    },
  } as unknown as KrMarketCalendarStore;
  const universe = { execute: async () => ["005930", "000660"] } as unknown as ResolveKrStockUniverse;
  return { sync: new SyncKrMinuteBars(kis, store, calendar, universe, opts.clock ?? (() => AT)), asked, calendarCalls, pruned };
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
    // 15:25 버킷 = KST 925분 — 종가 봉
    const full = (hasClose: boolean) => ({ count: 76, lastMinute: hasClose ? 925 : 920 });
    const byDate = new Map<string, { count: number; lastMinute: number }>();
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

  it("어느 줄에 서나 — 오늘만 분봉 줄 · 지난 날은 유니버스 bulk · 새 종목 backfill (SRV-REQ-057 FR-9)", async () => {
    // 15:40 장 마감 회차 — 오늘(10-30)과 지난 날이 섞인다
    const { sync, asked } = setup();
    await sync.execute();
    const today = asked.filter((a) => a.date === "2026-10-30");
    const past = asked.filter((a) => a.date < "2026-10-30");
    assert.ok(today.length > 0 && past.length > 0);
    assert.ok(today.every((a) => a.history === undefined), "오늘은 분봉 줄");
    assert.ok(past.every((a) => a.history === "bulk"), "지난 날 1년 백필은 맨 뒤");
    // 큰 백필 회차도 같다
    const night = setup({ clock: () => AFTER_CLOSE });
    await night.sync.backfillOffHours();
    assert.ok(night.asked.filter((a) => a.date < "2026-10-30").every((a) => a.history === "bulk"));
    // 유니버스에 새로 든 종목 즉시 백필 — 지난 날은 백필 줄(유니버스 1년보다 앞)
    const joiner = setup();
    await joiner.sync.execute(["010950"]);
    const jp = joiner.asked.filter((a) => a.date < "2026-10-30");
    assert.ok(jp.length > 0 && jp.every((a) => a.history === "backfill"));
    assert.ok(joiner.asked.filter((a) => a.date === "2026-10-30").every((a) => a.history === undefined));
  });

  describe("날마다 다른 장 시간 — 수능일 · 새해 첫 개장일 (2026-11-21)", () => {
    /** 2026-11-20(금) 16:15 KST — 수능 다음 날 장 마감 뒤 큰 백필 */
    const AFTER_CSAT = new Date("2026-11-20T07:15:00Z");
    const fullDays = (from: string, to: string, over: Record<string, { count: number; lastMinute: number }> = {}) => {
      const byDate = new Map<string, { count: number; lastMinute: number }>();
      for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
        const d = new Date(t).toISOString().slice(0, 10);
        byDate.set(d, over[d] ?? { count: 77, lastMinute: 925 });
      }
      return new Map([["005930", byDate], ["000660", byDate]]);
    };

    it("수능일은 마감 1분 뒤 163100 부터 거슬러 받는다 — 평상일은 153100 그대로", async () => {
      // 11-19 = 실측 그대로 68봉 · 마지막 15:25(10:00~15:25 + 동시호가 봉 둘) — 16:25 종가 봉이 없다
      const coverage = fullDays("2025-11-21", "2026-11-20", { "2026-11-19": { count: 68, lastMinute: 925 }, "2026-11-20": { count: 70, lastMinute: 920 } });
      const { sync, asked } = setup({ coverage, clock: () => AFTER_CSAT });
      await sync.backfillOffHours();
      const csat = asked.filter((a) => a.date === "2026-11-19");
      const normal = asked.filter((a) => a.date === "2026-11-20");
      assert.ok(csat.length > 0, "수능일을 다시 받는다");
      assert.ok(csat.every((a) => a.hhmmss === "163100"), csat.map((a) => a.hhmmss).join());
      assert.ok(normal.length > 0 && normal.every((a) => a.hhmmss === "153100"));
    });

    it("수능일 종가 봉은 16:25 — 78봉에 16:25 가 있으면 다 찬 날 · 15:25 로 끝나면 다시 받는다", async () => {
      const done = fullDays("2025-11-21", "2026-11-20", { "2026-11-19": { count: 80, lastMinute: 985 } });
      const a = setup({ coverage: done, clock: () => AFTER_CSAT });
      await a.sync.backfillOffHours();
      assert.ok(!a.asked.some((x) => x.date === "2026-11-19"));
      // 봉 수는 넉넉해도 16:25 가 없으면(옛 고정 15:25 판정이면 "있다"였다) 최근 5개장일 안이라 다시 받는다
      const noClose = fullDays("2025-11-21", "2026-11-20", { "2026-11-19": { count: 78, lastMinute: 925 } });
      const b = setup({ coverage: noClose, clock: () => AFTER_CSAT });
      await b.sync.backfillOffHours();
      assert.ok(b.asked.some((x) => x.date === "2026-11-19"));
    });

    it("새해 첫 개장일(2026-01-02, 10:00 개장)은 66칸 — 65봉이면 다 찬 날이라 다시 받지 않는다", async () => {
      const at = new Date("2026-01-16T07:15:00Z"); // 01-16(금) 16:15 — 01-02 는 최근 5개장일 밖
      const coverage = fullDays("2025-01-17", "2026-01-16", { "2026-01-02": { count: 65, lastMinute: 925 } });
      const { sync, asked } = setup({ coverage, clock: () => at, closed: ["2026-01-01"] });
      await sync.backfillOffHours();
      assert.ok(!asked.some((a) => a.date === "2026-01-02"), "고정 70 이던 때는 늘 미완");
      // 56봉(진짜 빈 날)은 다시 받는다
      const holey = fullDays("2025-01-17", "2026-01-16", { "2026-01-02": { count: 56, lastMinute: 925 } });
      const h = setup({ coverage: holey, clock: () => at, closed: ["2026-01-01"] });
      await h.sync.backfillOffHours();
      assert.ok(h.asked.some((a) => a.date === "2026-01-02"));
    });

    it("원천 분봉을 받은 날만 장 시간 밖 봉을 걷는다 — 수능일 [10:00, 16:30) · 못 받은 날은 그대로", async () => {
      const coverage = fullDays("2025-11-21", "2026-11-20", { "2026-11-19": { count: 68, lastMinute: 925 } });
      const bar = (hhmm: string) => ({
        timestamp: new Date(`2026-11-19T${hhmm}:00+09:00`),
        open: 1, high: 1, low: 1, close: 1, volume: 1,
      });
      const { sync, pruned } = setup({
        coverage,
        clock: () => AFTER_CSAT,
        // 005930 만 원천이 온다(쪽 하나 — 첫 봉이 10:00 이라 더 거슬러 가지 않는다)
        minutes: (code, date) => (code === "005930" && date === "2026-11-19" ? [bar("16:29"), bar("10:00")] : []),
      });
      await sync.backfillOffHours();
      const csat = pruned.filter((p) => p.date === "2026-11-19");
      assert.deepEqual(csat, [{ code: "005930", date: "2026-11-19", hours: { open: 600, close: 990 } }]);
    });
  });
});
