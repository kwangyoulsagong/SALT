import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Candle, KrMarketCalendarStore, KrStockQuotePort, KrStockStore, UniverseSnapshotStore } from "../../domain";
import { crossedKst } from "../../../shared/infrastructure/wake";
import {
  BackfillKrUniverseJoiners,
  completeFiveMinuteBars,
  ResolveKrStockUniverse,
  SyncKrSlotlessMinuteBars,
  type SyncKrDailyCandles,
  type SyncKrMinuteBars,
} from "../SyncKrStock";

/** 국내 분봉 따라잡기(`SRV-REQ-057` FR-4 · 5 · 6) */
const minute = (iso: string, close = 100): Candle => ({
  open: close, high: close, low: close, close, volume: 1, timestamp: new Date(iso),
});

describe("1분봉 창 → 5분봉 (FR-5)", () => {
  it("창 시작이 버킷 중간이면 첫 버킷은 반쪽이라 뺀다", () => {
    // KST 10:02 ~ 10:11 → 10:00 버킷은 반쪽, 10:05 버킷은 온전, 10:10 은 진행 중(병합 저장이라 둔다)
    const minutes = Array.from({ length: 10 }, (_, i) => minute(new Date(Date.parse("2026-11-11T01:02:00Z") + i * 60_000).toISOString()));
    const bars = completeFiveMinuteBars(minutes);
    assert.deepEqual(bars.map((b) => b.timestamp.toISOString()), ["2026-11-11T01:05:00.000Z", "2026-11-11T01:10:00.000Z"]);
    assert.deepEqual(completeFiveMinuteBars([]), []);
  });
});

const universeOf = (codes: string[]) => ({ execute: async () => codes }) as unknown as ResolveKrStockUniverse;
const calendarOpen = { days: async (from: string, to: string) => [{ date: "2026-11-11", isOpen: true }].filter((d) => d.date >= from && d.date <= to) } as unknown as KrMarketCalendarStore;

describe("슬롯 밖 장중 5분봉 (FR-5)", () => {
  it("장중 · 슬롯 밖 종목만 받고 한 문장으로 쓴다 — 장 밖이면 0호출", async () => {
    const asked: string[] = [];
    const writes: number[] = [];
    const kis = {
      dayMinuteCandles: async (code: string) => {
        asked.push(code);
        return [minute("2026-11-11T01:00:00Z"), minute("2026-11-11T01:04:00Z")];
      },
    } as unknown as KrStockQuotePort;
    const store = { upsertMinuteCandles: async (bars: unknown[]) => void writes.push(bars.length) } as unknown as KrStockStore;
    const at = (iso: string) => () => new Date(iso);

    const inSession = new SyncKrSlotlessMinuteBars(kis, store, calendarOpen, universeOf(["A", "B", "C"]), () => ["B"], at("2026-11-11T01:10:00Z"));
    const r = await inSession.execute();
    assert.equal(r.skipped, false);
    assert.deepEqual(asked.sort(), ["A", "C"]);
    assert.deepEqual(writes, [2]);

    asked.length = 0;
    const evening = new SyncKrSlotlessMinuteBars(kis, store, calendarOpen, universeOf(["A"]), () => [], at("2026-11-11T08:00:00Z"));
    assert.equal((await evening.execute()).skipped, true);
    assert.deepEqual(asked, []);
  });
});

describe("유니버스 합류 즉시 백필 (FR-4)", () => {
  const run = async (previous: string[] | null) => {
    const daily: string[][] = [];
    const minutes: string[][] = [];
    const snapshots = { latestBefore: async () => previous } as unknown as UniverseSnapshotStore;
    const joiners = new BackfillKrUniverseJoiners(
      universeOf(["005930", "114800", "000660"]),
      snapshots,
      { execute: async (only?: string[]) => void daily.push(only ?? []) } as unknown as SyncKrDailyCandles,
      { execute: async (only?: string[]) => void minutes.push(only ?? []) } as unknown as SyncKrMinuteBars,
      () => new Date("2026-11-11T01:00:00Z")
    );
    return { result: await joiners.execute(), daily, minutes };
  };

  it("직전 스냅샷에 없던 코드만 일봉 · 5분봉", async () => {
    const { result, daily, minutes } = await run(["005930", "000660"]);
    assert.deepEqual(result.joiners, ["114800"]);
    assert.deepEqual(daily, [["114800"]]);
    assert.deepEqual(minutes, [["114800"]]);
  });

  it("새 코드 없음 · 직전 스냅샷 없음(첫날)이면 0호출", async () => {
    assert.deepEqual((await run(["005930", "114800", "000660"])).daily, []);
    assert.deepEqual((await run(null)).daily, []);
  });
});

describe("자는 동안 KST 15:45 가 지났나 (FR-6)", () => {
  const ev = (from: string, to: string) => ({ from: new Date(from), to: new Date(to), sleptMs: 0 });
  it("경계 표", () => {
    // 15:45 KST = 06:45Z
    assert.equal(crossedKst(ev("2026-11-11T06:00:00Z", "2026-11-11T07:00:00Z"), 15, 45), true);
    assert.equal(crossedKst(ev("2026-11-11T06:45:00Z", "2026-11-11T07:00:00Z"), 15, 45), false, "시작이 정각이면 그 회차는 이미 돌았다");
    assert.equal(crossedKst(ev("2026-11-11T06:00:00Z", "2026-11-11T06:45:00Z"), 15, 45), true, "끝이 정각이면 지났다");
    assert.equal(crossedKst(ev("2026-11-10T19:27:00Z", "2026-11-10T23:27:00Z"), 15, 45), false, "새벽 수면");
    assert.equal(crossedKst(ev("2026-11-10T03:00:00Z", "2026-11-11T02:00:00Z"), 15, 45), true, "전날 낮부터 다음 날 아침");
  });
});
