import { describe, expect, it } from "vitest";

import {
  candleTimeMs,
  type KstCandle,
  mergeRealtimeCandle,
  toKstTimestamp,
} from "./candleTime";

/** 2026-09-22T11:50:00 KST = 02:50:00 UTC */
const T0_KST = "2026-09-22T11:50:00";
const T0_MS = Date.UTC(2026, 8, 22, 2, 50, 0);
const MINUTE = 60_000;

const candle = (timestamp: string, close: number, volume = 10): KstCandle => ({
  timestamp,
  open: 100,
  high: Math.max(100, close),
  low: Math.min(100, close),
  close,
  volume,
});

describe("candleTimeMs", () => {
  it("숫자(ms)는 그대로 돌려준다", () => {
    expect(candleTimeMs(T0_MS)).toBe(T0_MS);
  });

  it("시간대 표기가 없는 문자열은 KST 로 읽는다 — 브라우저 시간대와 무관", () => {
    expect(candleTimeMs(T0_KST)).toBe(T0_MS);
    expect(candleTimeMs("2026-09-22 11:50:00")).toBe(T0_MS);
    expect(candleTimeMs("2026-09-22T11:50")).toBe(T0_MS);
  });

  it("시간대 표기가 있으면 그 표기를 따른다", () => {
    expect(candleTimeMs("2026-09-22T02:50:00Z")).toBe(T0_MS);
    expect(candleTimeMs("2026-09-22T11:50:00+09:00")).toBe(T0_MS);
  });

  it("읽을 수 없으면 NaN — 병합이 버린다", () => {
    expect(candleTimeMs("not a time")).toBeNaN();
  });
});

describe("toKstTimestamp", () => {
  it("candleTimeMs 의 역이다", () => {
    expect(toKstTimestamp(T0_MS)).toBe(T0_KST);
    expect(candleTimeMs(toKstTimestamp(T0_MS + 7 * MINUTE))).toBe(
      T0_MS + 7 * MINUTE,
    );
  });

  it("KST 로 날이 바뀌는 시각을 맞게 넘긴다", () => {
    // 2026-09-22T15:00Z = 2026-09-23T00:00 KST
    expect(toKstTimestamp(Date.UTC(2026, 8, 22, 15, 0, 0))).toBe(
      "2026-09-23T00:00:00",
    );
  });
});

describe("mergeRealtimeCandle", () => {
  const prev = [
    candle("2026-09-22T11:49:00", 101),
    candle(T0_KST, 102),
  ];

  it("같은 봉(REST 문자열 · WS ms) 이면 마지막 봉을 갱신한다 — 새 봉을 붙이지 않는다", () => {
    const next = mergeRealtimeCandle(prev, {
      timestamp: T0_MS,
      open: 999, // BFF 시가는 켜진 뒤 첫 틱 — 무시한다
      high: 110,
      low: 95,
      close: 108,
      volume: 25,
    });
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({
      timestamp: T0_KST,
      open: 100,
      high: 110,
      low: 95,
      close: 108,
      volume: 25,
    });
    expect(next[0]).toBe(prev[0]);
  });

  it("거래량은 두 값 중 큰 값 — BFF 누계가 조회 값보다 작을 수 있다", () => {
    const next = mergeRealtimeCandle(prev, {
      timestamp: T0_MS,
      open: 100,
      high: 102,
      low: 100,
      close: 103,
      volume: 3,
    });
    expect(next[1]!.volume).toBe(10);
  });

  it("바뀐 것이 없으면 같은 배열을 돌려준다", () => {
    const same = mergeRealtimeCandle(prev, {
      timestamp: T0_MS,
      open: 100,
      high: 102,
      low: 100,
      close: 102,
      volume: 10,
    });
    expect(same).toBe(prev);
  });

  it("다음 봉이면 붙이고 가장 오래된 봉을 버린다 — 창 크기 고정", () => {
    const next = mergeRealtimeCandle(prev, {
      timestamp: T0_MS + MINUTE,
      open: 102,
      high: 104,
      low: 101,
      close: 103,
      volume: 1,
    });
    expect(next).toHaveLength(2);
    expect(next[0]).toBe(prev[1]);
    expect(next[1]).toEqual({
      timestamp: "2026-09-22T11:51:00",
      open: 102,
      high: 104,
      low: 101,
      close: 103,
      volume: 1,
    });
  });

  it("더 옛 봉 · 읽을 수 없는 시각 · 빈 배열은 그대로 둔다", () => {
    const tick = { open: 1, high: 1, low: 1, close: 1, volume: 1 };
    expect(
      mergeRealtimeCandle(prev, { ...tick, timestamp: T0_MS - 5 * MINUTE }),
    ).toBe(prev);
    expect(mergeRealtimeCandle(prev, { ...tick, timestamp: "garbage" })).toBe(
      prev,
    );
    const empty: KstCandle[] = [];
    expect(mergeRealtimeCandle(empty, { ...tick, timestamp: T0_MS })).toBe(
      empty,
    );
  });
});
