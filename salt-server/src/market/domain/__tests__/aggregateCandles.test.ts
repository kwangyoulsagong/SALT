import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aggregateCandles } from "../index";

/** 5분봉을 1시간봉으로 묶는 규칙 — F010 슬라이스 0. */
describe("aggregateCandles", () => {
  const HOUR = 3600_000;
  const t0 = Date.parse("2026-09-27T10:00:00Z");
  // 최신이 앞: 10:55, 10:50, …, 10:00, 09:55, … 09:00 (24개)
  const fiveMin = Array.from({ length: 24 }, (_, i) => {
    const ts = t0 + HOUR - (i + 1) * 5 * 60_000; // 10:55 → 09:00
    const n = 24 - i; // 오래된 봉일수록 작은 값
    return { open: n, high: n + 0.5, low: n - 0.5, close: n + 0.1, volume: 1, timestamp: new Date(ts) };
  });

  it("시각 버킷마다 open 은 첫 봉, close 는 마지막 봉, high/low 는 극값, volume 은 합이다", () => {
    const hourly = aggregateCandles(fiveMin, HOUR);
    assert.equal(hourly.length, 2);
    // 최신(10시대)이 앞
    assert.equal(hourly[0].timestamp.toISOString(), "2026-09-27T10:00:00.000Z");
    assert.equal(hourly[0].open, 13); // 10:00 봉
    assert.equal(hourly[0].close, 24.1); // 10:55 봉
    assert.equal(hourly[0].high, 24.5);
    assert.equal(hourly[0].low, 12.5);
    assert.equal(hourly[0].volume, 12);
    assert.equal(hourly[1].open, 1);
    assert.equal(hourly[1].close, 12.1);
  });

  it("거래량이 전부 null 이면 null, 하나라도 있으면 합이다", () => {
    const rows = fiveMin.slice(0, 12).map((c) => ({ ...c, volume: null }));
    assert.equal(aggregateCandles(rows, HOUR)[0].volume, null);
    rows[3] = { ...rows[3], volume: 7 };
    assert.equal(aggregateCandles(rows, HOUR)[0].volume, 7);
  });

  it("버킷이 1 이면 입력을 순서만 보존해 돌려준다", () => {
    const one = fiveMin.slice(0, 3);
    const out = aggregateCandles(one, 5 * 60_000);
    assert.deepEqual(out.map((c) => c.close), one.map((c) => c.close));
  });
});
