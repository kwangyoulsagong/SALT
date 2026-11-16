import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Candle, KrMarketCalendarStore, KrStockQuotePort, KrStockStore } from "../../domain";
import { SyncKrDailyCandles, SyncKrFullDailyCandles, type ResolveKrStockUniverse } from "../SyncKrStock";

/** 전 종목 일봉 5년(SRV-REQ-040 FR-40) — 시세 창(개장일 08:30~16:00) 밖에서만 · 저장된 봉이 진행 표시 · 거꾸로 받다 빈 페이지면 끝 */

const kstMidnight = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 9 * 3_600_000);
const bar = (date: string): Candle => ({ open: 1, high: 1, low: 1, close: 1, volume: 1, timestamp: kstMidnight(date) });

// 목요일 21:00 KST
const NIGHT = new Date("2026-10-08T12:00:00Z");

/** 평일 = 개장 달력 */
const CALENDAR = {
  days: async (from: string, to: string) => {
    const out = [];
    for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
      const d = new Date(t);
      out.push({ date: d.toISOString().slice(0, 10), isOpen: d.getUTCDay() !== 0 && d.getUTCDay() !== 6 });
    }
    return out;
  },
} as unknown as KrMarketCalendarStore;

const setup = (opts: {
  listings: Array<{ code: string; listedAt: Date | null }>;
  range?: Map<string, { earliest: Date; latest: Date }>;
  /** 이 날짜 이전 봉은 KIS 에 없다 */
  historyFrom?: string;
  clock?: () => Date;
}) => {
  const calls: Array<{ code: string; from: string; to: string }> = [];
  const kis = {
    dailyCandles: async (code: string, from: string, to: string) => {
      calls.push({ code, from, to });
      const start = opts.historyFrom && opts.historyFrom > from ? opts.historyFrom : from;
      return start <= to ? [bar(start), bar(to)] : [];
    },
  } as unknown as KrStockQuotePort;
  const store = {
    commonStockListings: async () => opts.listings,
    dailyCandleRange: async () => opts.range ?? new Map(),
    edgeDailyCloses: async () => new Map(),
    upsertDailyCandles: async () => {},
  } as unknown as KrStockStore;
  return { sync: new SyncKrFullDailyCandles(kis, store, CALENDAR, opts.clock ?? (() => NIGHT)), calls };
};

describe("SyncKrFullDailyCandles", () => {
  it("계획 — 증분이 먼저, 앞쪽 하한은 5년 전과 상장일 중 늦은 쪽, 하한 근처면 앞쪽은 끝난 것", () => {
    const { sync } = setup({ listings: [] });
    const range = new Map([
      ["000001", { earliest: kstMidnight("2024-10-08"), latest: kstMidnight("2026-10-07") }],
      ["000002", { earliest: kstMidnight("2021-10-12"), latest: kstMidnight("2026-10-08") }],
    ]);
    const work = sync.plan(
      [
        { code: "000001", listedAt: null },
        { code: "000002", listedAt: null },
        { code: "000003", listedAt: new Date("2025-03-02T00:00:00Z") },
      ],
      range,
      "2026-10-08"
    );
    assert.deepEqual(work, [
      // 마지막 봉 앞 14일부터 겹쳐 받는다 — 수정주가 재작성 판정(FR-42)
      { code: "000001", from: "2026-09-23", to: "2026-10-08", direction: "forward" },
      { code: "000001", from: "2021-10-08", to: "2024-10-07", direction: "backward" },
      { code: "000003", from: "2025-03-02", to: "2026-10-08", direction: "backward" },
    ]);
  });

  it("거꾸로 받다 빈 페이지가 나오면 그 종목은 끝 — 상장일을 몰라도 호출을 낭비하지 않는다", async () => {
    const { sync, calls } = setup({ listings: [{ code: "000003", listedAt: null }], historyFrom: "2026-03-01" });
    const r = await sync.execute();
    assert.equal(r.skipped, false);
    // 140일 페이지: 10-08 → 05-22 → (03-01 부터 있음) → 빈 페이지에서 멈춤
    assert.ok(calls.length <= 4, `호출 ${calls.length}`);
    assert.deepEqual(calls.at(-1)!.to < "2026-03-01", true);
    assert.ok(calls.every((c, i) => i === 0 || c.to < calls[i - 1].from));
  });

  it("다음 개장일 08:30 KST 가 오면 새 요청을 멈추고 남은 일을 다음 회차로 넘긴다", async () => {
    let t = NIGHT.getTime();
    const listings = Array.from({ length: 30 }, (_, i) => ({ code: String(i).padStart(6, "0"), listedAt: null }));
    // 시계를 읽을 때마다 30분 — 11.5시간 뒤(금 08:30)까지 몇 번만 받는다
    const { sync, calls } = setup({ listings, clock: () => new Date((t += 3_600_000 / 2)) });
    const r = await sync.execute();
    assert.equal(r.skipped, false);
    if (!r.skipped) {
      assert.equal(r.stopped, true);
      assert.ok(r.remaining > 0);
    }
    assert.ok(calls.length < 30 * 13);
  });

  it("시세 창(개장일 08:30~16:00)에 불리면 KIS 호출 0 — cron · 부팅 · 깸 어느 길이든", async () => {
    const listings = [{ code: "000001", listedAt: null }];
    for (const at of ["2026-10-08T23:30:00Z", "2026-10-09T03:00:00Z", "2026-10-09T06:59:00Z"]) {
      const { sync, calls } = setup({ listings, clock: () => new Date(at) });
      assert.deepEqual(await sync.execute(), { skipped: true, reason: "quote_window" });
      assert.equal(calls.length, 0, at);
    }
  });

  it("평일 16:15(장 마감 뒤 회차)는 돈다 — 08:29 도 돈다", async () => {
    const listings = [{ code: "000001", listedAt: null }];
    for (const at of ["2026-10-08T07:15:00Z", "2026-10-08T23:29:00Z"]) {
      const { sync, calls } = setup({ listings, clock: () => new Date(at) });
      const r = await sync.execute();
      assert.equal(r.skipped, false, at);
      assert.ok(calls.length > 0, at);
    }
  });

  it("도는 중 잠들었다 시세 창 안에서 깨면 그 자리에서 멈춘다 — 깬 뒤 KIS 호출 0", async () => {
    const listings = Array.from({ length: 10 }, (_, i) => ({ code: String(i).padStart(6, "0"), listedAt: null }));
    let slept = false;
    let callsAfterWake = 0;
    const kis = {
      dailyCandles: async (_code: string, from: string, to: string) => {
        if (slept) callsAfterWake++;
        // 첫 호출 중 잠들어 금요일 09:00 KST 에 깬다
        slept = true;
        return [bar(from), bar(to)];
      },
    } as unknown as KrStockQuotePort;
    const store = {
      commonStockListings: async () => listings,
      dailyCandleRange: async () => new Map(),
      edgeDailyCloses: async () => new Map(),
      upsertDailyCandles: async () => {},
    } as unknown as KrStockStore;
    const sync = new SyncKrFullDailyCandles(kis, store, CALENDAR, () =>
      slept ? new Date("2026-10-09T00:00:00Z") : NIGHT
    );
    const r = await sync.execute();
    assert.equal(r.skipped, false);
    if (!r.skipped) assert.equal(r.stopped, true);
    // 동시 6개가 이미 출발했을 수 있다(첫 호출과 같은 순간) — 깬 뒤 새로 고른 일은 0
    assert.ok(callsAfterWake <= 5, `깬 뒤 호출 ${callsAfterWake}`);
  });

  it("회차가 겹치면 뒤 회차는 건너뛴다", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const kis = { dailyCandles: async () => (await gate, []) } as unknown as KrStockQuotePort;
    const store = {
      commonStockListings: async () => [{ code: "000001", listedAt: null }],
      dailyCandleRange: async () => new Map(),
      edgeDailyCloses: async () => new Map(),
      upsertDailyCandles: async () => {},
    } as unknown as KrStockStore;
    const sync = new SyncKrFullDailyCandles(kis, store, CALENDAR, () => NIGHT);
    const first = sync.execute();
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(await sync.execute(), { skipped: true, reason: "running" });
    release();
    assert.equal((await first).skipped, false);
  });

  it("토요일 회차는 전 종목 앞쪽 끝 한 페이지를 대조한다 — 겹침 창이 놓친 재작성(FR-42)", () => {
    const { sync } = setup({ listings: [] });
    const range = new Map([["000001", { earliest: kstMidnight("2021-10-12"), latest: kstMidnight("2026-10-09") }]]);
    const work = sync.plan([{ code: "000001", listedAt: null }], range, "2026-10-10");
    assert.deepEqual(work, [
      { code: "000001", from: "2026-09-25", to: "2026-10-10", direction: "forward" },
      { code: "000001", from: "2021-10-12", to: "2022-02-28", direction: "audit" },
    ]);
  });

  it("겹친 봉이 저장본과 다르면 그 종목 이력을 첫 봉부터 다시 받아 통째로 바꾼다", async () => {
    const replaced: Array<{ code: string; candles: Candle[] }> = [];
    const upserted: string[] = [];
    const calls: Array<{ from: string; to: string }> = [];
    // KIS 는 이제 1:5 병합 뒤 기준 — 모든 날이 1480
    const kis = {
      dailyCandles: async (_code: string, from: string, to: string) => {
        calls.push({ from, to });
        return [{ ...bar(from), close: 1480 }, { ...bar(to), close: 1480 }];
      },
    } as unknown as KrStockQuotePort;
    const store = {
      commonStockListings: async () => [{ code: "093240", listedAt: null }],
      dailyCandleRange: async () =>
        new Map([["093240", { earliest: kstMidnight("2021-10-12"), latest: kstMidnight("2026-10-07") }]]),
      edgeDailyCloses: async () =>
        new Map([
          [
            "093240",
            [
              { timestamp: kstMidnight("2026-09-23"), close: 296 },
              { timestamp: kstMidnight("2026-10-07"), close: 1480 },
            ],
          ],
        ]),
      upsertDailyCandles: async (code: string) => void upserted.push(code),
      replaceDailyCandles: async (code: string, candles: Candle[]) => void replaced.push({ code, candles }),
    } as unknown as KrStockStore;
    const r = await new SyncKrFullDailyCandles(kis, store, CALENDAR, () => NIGHT).execute();
    assert.equal(r.skipped, false);
    if (!r.skipped) assert.equal(r.rewritten, 1);
    assert.equal(replaced.length, 1);
    assert.deepEqual(upserted, []);
    // 겹침 한 페이지 + 첫 봉(2021-10-12)부터 다시 받은 140일 페이지들
    assert.deepEqual(calls[0], { from: "2026-09-23", to: "2026-10-08" });
    assert.equal(calls[1].from, "2021-10-12");
    assert.equal(calls.at(-1)!.to, "2026-10-08");
  });
});

describe("SyncKrFullDailyCandles — 토요일 회차", () => {
  it("증분이 재작성을 보고 바꾼 종목은 같은 회차의 앞쪽 대조가 다시 받지 않는다", async () => {
    const replaced: string[] = [];
    const kis = {
      dailyCandles: async (_code: string, from: string, to: string) => [
        { ...bar(from), close: 1480 },
        { ...bar(to), close: 1480 },
      ],
    } as unknown as KrStockQuotePort;
    const recent = [{ timestamp: kstMidnight("2026-09-25"), close: 296 }];
    const oldest = [{ timestamp: kstMidnight("2021-10-12"), close: 3534 }];
    const store = {
      commonStockListings: async () => [{ code: "093240", listedAt: null }],
      dailyCandleRange: async () =>
        new Map([["093240", { earliest: kstMidnight("2021-10-12"), latest: kstMidnight("2026-10-09") }]]),
      // 앞쪽 끝 · 마지막 쪽 둘 다 옛 기준
      edgeDailyCloses: async (_codes: string[], edge: "earliest" | "latest") =>
        new Map([["093240", edge === "latest" ? recent : oldest]]),
      upsertDailyCandles: async () => {},
      replaceDailyCandles: async (code: string) => void replaced.push(code),
    } as unknown as KrStockStore;
    // 토요일 08:00 KST
    const r = await new SyncKrFullDailyCandles(kis, store, CALENDAR, () => new Date("2026-10-09T23:00:00Z")).execute();
    assert.deepEqual(replaced, ["093240"]);
    if (!r.skipped) assert.equal(r.rewritten, 1);
  });
});

describe("SyncKrDailyCandles", () => {
  const universe = { execute: async () => ["000001", "000002"] } as unknown as ResolveKrStockUniverse;

  it("시세 유니버스도 같은 겹침 판정 — 재작성 종목만 바꾸고 나머지는 이어 쓴다", async () => {
    const replaced: string[] = [];
    const upserted: string[] = [];
    const kis = {
      dailyCandles: async (code: string, from: string, to: string) => [
        { ...bar(from), close: code === "000001" ? 50 : 100 },
        { ...bar(to), close: 100 },
      ],
    } as unknown as KrStockQuotePort;
    const range = { earliest: kstMidnight("2026-03-02"), latest: kstMidnight("2026-10-07") };
    const store = {
      dailyCandleRange: async () => new Map([["000001", range], ["000002", range]]),
      edgeDailyCloses: async () =>
        new Map([
          ["000001", [{ timestamp: kstMidnight("2026-09-23"), close: 100 }]],
          ["000002", [{ timestamp: kstMidnight("2026-09-23"), close: 100 }]],
        ]),
      upsertDailyCandles: async (code: string) => void upserted.push(code),
      replaceDailyCandles: async (code: string) => void replaced.push(code),
    } as unknown as KrStockStore;
    const r = await new SyncKrDailyCandles(kis, store, universe, () => NIGHT).execute();
    assert.equal(r.rewritten, 1);
    assert.deepEqual(replaced, ["000001"]);
    assert.deepEqual(upserted, ["000002"]);
  });
});
