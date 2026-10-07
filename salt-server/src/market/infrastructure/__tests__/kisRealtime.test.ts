import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KrMinuteBarBuilder, type KrTick } from "../../domain";
import { parseTickFrame } from "../KisRealtimeClient";

/** `H0STCNT0` 레코드 하나(46필드) — 쓰는 칸만 채운다 */
const record = (code: string, time: string, price: number, vol: number) => {
  const f = Array(46).fill("0");
  f[0] = code; f[1] = time; f[2] = String(price); f[4] = "-1500"; f[5] = "-0.55";
  f[12] = String(vol); f[13] = "11300793"; f[14] = "3097411759750"; f[33] = "20261007"; f[35] = "N";
  return f.join("^");
};

describe("parseTickFrame — 체결 프레임 (F011 FR-24)", () => {
  it("한 프레임에 여러 건 · 부호 있는 대비 · KST 시각", () => {
    const raw = `0|H0STCNT0|002|${record("005930", "142301", 270500, 10)}^${record("000660", "142302", 1773000, 3)}`;
    const ticks = parseTickFrame(raw);
    assert.equal(ticks.length, 2);
    assert.equal(ticks[0].code, "005930");
    assert.equal(ticks[0].change, -1500);
    assert.equal(ticks[0].changeRate, -0.55);
    assert.equal(ticks[0].accVolume, 11_300_793n);
    assert.deepEqual(ticks[0].at, new Date("2026-10-07T05:23:01Z"));
  });

  it("암호화 프레임 · 다른 TR · 깨진 필드 수는 버린다", () => {
    assert.deepEqual(parseTickFrame(`1|H0STCNI0|001|x^y`), []);
    assert.deepEqual(parseTickFrame(`0|H0STASP0|001|${record("005930", "142301", 1, 1)}`), []);
    assert.deepEqual(parseTickFrame(`0|H0STCNT0|002|a^b^c`), []);
  });
});

const tick = (at: string, price: number, vol: number, code = "005930"): KrTick => ({
  code, price, change: 0, changeRate: 0, tradeVolume: vol, accVolume: 0n, accTradeValue: 0, isHalted: false,
  at: new Date(`2026-10-07T${at}+09:00`),
});

describe("KrMinuteBarBuilder — 체결 → 5분봉 (FR-21)", () => {
  it("버킷 OHLCV · 늦게 온 체결은 시가를 바꾸지 않는다 · 봉 시각 = 버킷 시작", () => {
    const b = new KrMinuteBarBuilder();
    b.add(tick("14:20:05", 100, 1));
    b.add(tick("14:22:00", 105, 2));
    b.add(tick("14:21:00", 95, 3));
    b.add(tick("14:24:59", 101, 4));
    b.add(tick("14:25:00", 102, 5)); // 다음 버킷
    const bars = b.drain(new Date("2026-10-07T05:25:30Z"));
    const first = bars.find((x) => x.candle.timestamp.toISOString() === "2026-10-07T05:20:00.000Z")!.candle;
    assert.deepEqual([first.open, first.high, first.low, first.close, first.volume], [100, 105, 95, 101, 10]);
    assert.equal(bars.length, 2);
  });

  it("정규장 밖 체결(동시호가 전 · 시간외)은 봉에 넣지 않는다", () => {
    const b = new KrMinuteBarBuilder();
    b.add(tick("08:59:59", 100, 1));
    b.add(tick("15:30:00", 100, 1));
    b.add(tick("16:10:00", 100, 1));
    assert.equal(b.drain(new Date("2026-10-07T07:20:00Z")).length, 0);
  });

  it("drain 은 바뀐 봉만 낸다 — 두 번째는 비어 있다", () => {
    const b = new KrMinuteBarBuilder();
    b.add(tick("10:00:01", 100, 1));
    assert.equal(b.drain(new Date("2026-10-07T01:00:30Z")).length, 1);
    assert.equal(b.drain(new Date("2026-10-07T01:00:31Z")).length, 0);
  });
});
