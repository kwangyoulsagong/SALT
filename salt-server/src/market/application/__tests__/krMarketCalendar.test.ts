import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  KRX_NOTICE_COVERED_THROUGH,
  type KrCalendarSource,
  type KrMarketCalendarStore,
  type KrMarketDay,
  type KrStockQuotePort,
} from "../../domain";
import { SyncKrMarketCalendar } from "../SyncKrStock";

/** F011 FR-14 — KIS 휴장일 조회가 막혀도 지난날(역산) · 오늘(관측) · 미래(공시 표)를 채운다 */

const day = (date: string, isOpen: boolean): KrMarketDay => ({
  date,
  isOpen,
  isTradingDay: isOpen,
  isBusinessDay: isOpen,
  isSettlementDay: isOpen,
});

const setup = (derived: KrMarketDay[], todayBars: number) => {
  const writes: Array<{ source: KrCalendarSource; days: KrMarketDay[] }> = [];
  const calendar: KrMarketCalendarStore = {
    upsertDays: async (days, _at, source) => {
      writes.push({ source, days });
    },
    daysFromDailyCandles: async () => derived,
    days: async () => [],
  };
  const kis = {
    marketDays: async () => {
      throw new Error("EGW02004");
    },
    dailyCandles: async () => Array.from({ length: todayBars }, () => ({})),
  } as unknown as KrStockQuotePort;
  return { writes, calendar, kis };
};

describe("SyncKrMarketCalendar — 공시 표가 미래를 채운다 (FR-14)", () => {
  it("KIS 가 거부하면 역산 → 관측 → 공시 순으로 쓰고, 공시는 오늘부터 표 끝까지다", async () => {
    const { writes, calendar, kis } = setup([day("2026-10-28", true), day("2026-10-29", true)], 1);
    const result = await new SyncKrMarketCalendar(kis, calendar, () => new Date("2026-10-30T01:00:00Z")).execute();

    assert.deepEqual(
      writes.map((w) => w.source),
      ["candles", "probe", "krx_notice"]
    );
    const notice = writes[2]!.days;
    assert.equal(notice[0]!.date, "2026-10-30");
    assert.equal(notice.at(-1)!.date, KRX_NOTICE_COVERED_THROUGH);
    assert.equal(notice.find((d) => d.date === "2026-12-25")?.isOpen, false);
    assert.equal(notice.find((d) => d.date === "2026-12-31")?.isOpen, false);
    assert.equal(result.source, "candles");
    assert.deepEqual(result.mismatched, []);
  });

  it("지난날 역산이 공시 표와 어긋난 날을 돌려준다 — 표 오타 · 공시 뒤 임시공휴일", async () => {
    // 10-09 한글날에 봉이 있었다고(역산 = 개장) 꾸민다
    const { calendar, kis } = setup([day("2026-10-08", true), day("2026-10-09", true), day("2026-10-12", true)], 0);
    const result = await new SyncKrMarketCalendar(kis, calendar, () => new Date("2026-10-13T00:00:00Z")).execute();
    assert.deepEqual(result.mismatched, ["2026-10-09"]);
  });

  it("공시 표가 덮기 전 해의 역산은 대조하지 않는다 — 2025 휴장을 어긋남으로 세지 않는다", async () => {
    const { calendar, kis } = setup([day("2025-12-25", false), day("2025-12-26", true)], 0);
    const result = await new SyncKrMarketCalendar(kis, calendar, () => new Date("2026-10-30T00:00:00Z")).execute();
    assert.deepEqual(result.mismatched, []);
  });
});
