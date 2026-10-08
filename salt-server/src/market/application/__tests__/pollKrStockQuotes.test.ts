import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { KrMarketCalendarStore, KrStockQuoteFact, KrStockQuotePort, KrStockStore } from "../../domain";
import { PollKrStockQuotes, type ResolveKrStockUniverse } from "../SyncKrStock";

/** 현재가 폴링 — 장 밖에서도 시세가 없는 유니버스 종목은 받는다(F011 슬라이스 3b) */

const calendar: KrMarketCalendarStore = { upsertDays: async () => {}, daysFromDailyCandles: async () => [], days: async () => [] };

const setup = (stored: string[], at: string) => {
  const asked: string[] = [];
  const kis = {
    quote: async (code: string) => {
      asked.push(code);
      return { code } as unknown as KrStockQuoteFact;
    },
  } as unknown as KrStockQuotePort;
  const store = {
    quotes: async (q: { codes?: string[] }) => stored.filter((c) => q.codes?.includes(c)).map((code) => ({ code })),
    realtimeFreshCodes: async () => [],
    upsertQuotes: async () => {},
  } as unknown as KrStockStore;
  const universe = { execute: async () => ["005930", "000660", "499790"] } as unknown as ResolveKrStockUniverse;
  const poll = new PollKrStockQuotes(kis, store, calendar, universe, () => new Date(at));
  return { poll, asked };
};

// 목요일 — 21:00 KST(장 마감 뒤) · 16:30 KST(시간외 단일가) · 10:00 KST(정규장)
const NIGHT = "2026-10-08T12:00:00Z";
const AFTER_HOURS_SINGLE = "2026-10-08T07:30:00Z";
const REGULAR = "2026-10-08T01:00:00Z";

describe("PollKrStockQuotes — 시세 없는 종목 채우기", () => {
  it("장 밖(기동 회차 뒤)엔 시세가 없는 종목만 받는다", async () => {
    const { poll, asked } = setup(["005930", "000660"], NIGHT);
    await poll.execute(); // 기동 회차 — 전부
    asked.length = 0;
    const r = await poll.execute();
    assert.deepEqual(asked, ["499790"]);
    assert.equal(r.skipped, false);
  });

  it("장 밖에 빠진 종목이 없으면 KIS 를 부르지 않는다", async () => {
    const { poll, asked } = setup(["005930", "000660", "499790"], NIGHT);
    await poll.execute();
    asked.length = 0;
    assert.equal((await poll.execute()).skipped, true);
    assert.deepEqual(asked, []);
  });

  it("시간외 단일가 중엔 빠진 종목도 받지 않는다 — 그 현재가는 시간외 값이다", async () => {
    const { poll, asked } = setup([], AFTER_HOURS_SINGLE);
    assert.equal((await poll.execute()).skipped, true);
    assert.deepEqual(asked, []);
  });

  it("정규장엔 전부 받는다", async () => {
    const { poll, asked } = setup(["005930", "000660", "499790"], REGULAR);
    await poll.execute();
    assert.deepEqual(asked.sort(), ["000660", "005930", "499790"]);
  });
});
