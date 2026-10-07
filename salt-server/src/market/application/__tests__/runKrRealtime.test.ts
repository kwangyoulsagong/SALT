import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { KrRealtimePort, KrStockStore, KrTick } from "../../domain";
import { RunKrRealtime } from "../RunKrRealtime";

const tick = (hhmmss: string, price: number): KrTick => ({
  code: "005930", price, change: 0, changeRate: 0, tradeVolume: 1, accVolume: 1n, accTradeValue: 0, isHalted: false,
  at: new Date(`2026-10-07T${hhmmss}+09:00`),
});

describe("RunKrRealtime — 정규장 체결만 현재가 · SSE 에 (FR-27)", () => {
  it("정규장(15:30) 뒤 체결은 현재가를 덮지 않고 SSE 로도 흘리지 않는다 — 15:45 장후 시간외 종가 시간에 붙어 있어도", async () => {
    let onTick: ((ticks: KrTick[]) => void) | null = null;
    const applied: KrTick[][] = [];
    const realtime = {
      connect: async (fn: (t: KrTick[]) => void) => { onTick = fn; },
      subscribe: async () => {},
      disconnect: async () => {},
      state: () => "open" as const,
      subscribed: () => ["005930"],
    } satisfies KrRealtimePort;
    const store = {
      applyTicks: async (t: KrTick[]) => { applied.push(t); },
      upsertMinuteCandles: async () => {},
    } as unknown as KrStockStore;
    const calendar = { days: async () => [{ date: "2026-10-07", isOpen: true, isTradingDay: true, isBusinessDay: true, isSettlementDay: true }], upsertDays: async () => {}, daysFromDailyCandles: async () => [] };
    const universe = { execute: async () => ["005930"] } as never;
    const run = new RunKrRealtime(realtime, store, calendar, universe, () => new Date("2026-10-07T06:45:00Z"));
    const events: unknown[] = [];
    run.listen((e) => events.push(...e));

    await run.reconcile();
    onTick!([tick("15:45:00", 269_500)]);
    onTick!([tick("15:30:00", 268_500)]);
    await (run as unknown as { flush: () => Promise<void> }).flush();

    assert.equal(events.length, 1);
    assert.deepEqual(applied.flat().map((t) => t.price), [268_500]);
    await realtime.disconnect();
  });
});
