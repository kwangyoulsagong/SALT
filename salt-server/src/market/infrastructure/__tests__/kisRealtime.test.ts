import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KrMinuteBarBuilder, krMinutesToFiveMinute, type KrTick } from "../../domain";
import { parseTickFrame } from "../KisRealtimeClient";

/** `H0STCNT0` 레코드 하나(46필드) — 쓰는 칸만 채운다 */
const record = (code: string, time: string, price: number, vol: number) => {
  const f = Array(46).fill("0");
  f[0] = code; f[1] = time; f[2] = String(price); f[4] = "-1500"; f[5] = "-0.55";
  f[7] = "269500"; f[8] = "271000"; f[9] = "0";
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
    // 당일 시 · 고 · 저(F011 슬라이스 3) — 0 은 값 없음
    assert.deepEqual([ticks[0].openPrice, ticks[0].highPrice, ticks[0].lowPrice], [269_500, 271_000, null]);
  });

  it("암호화 프레임 · 다른 TR · 깨진 필드 수는 버린다", () => {
    assert.deepEqual(parseTickFrame(`1|H0STCNI0|001|x^y`), []);
    assert.deepEqual(parseTickFrame(`0|H0STASP0|001|${record("005930", "142301", 1, 1)}`), []);
    assert.deepEqual(parseTickFrame(`0|H0STCNT0|002|a^b^c`), []);
  });
});

const tick = (at: string, price: number, vol: number, code = "005930"): KrTick => ({
  code, price, change: 0, changeRate: 0, tradeVolume: vol, accVolume: 0n, accTradeValue: 0, isHalted: false,
  openPrice: null, highPrice: null, lowPrice: null,
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

  it("정규장 밖 체결(동시호가 전 · 15:31 뒤 시간외)은 봉에 넣지 않는다", () => {
    const b = new KrMinuteBarBuilder();
    b.add(tick("08:59:59", 100, 1));
    b.add(tick("15:31:00", 100, 1));
    b.add(tick("16:10:00", 100, 1));
    assert.equal(b.drain(new Date("2026-10-07T07:20:00Z")).length, 0);
  });

  it("15:30 종가 단일가 체결은 15:25 봉의 종가가 된다 — 버리면 마지막 봉 종가가 일봉 종가와 달라진다", () => {
    const b = new KrMinuteBarBuilder();
    b.add(tick("15:19:58", 269_500, 10));
    b.add(tick("15:30:00", 270_000, 1_000));
    const bars = b.drain(new Date("2026-10-07T06:35:00Z"));
    const last = bars.find((x) => x.candle.timestamp.toISOString() === "2026-10-07T06:25:00.000Z")!.candle;
    assert.equal(last.close, 270_000);
    assert.equal(last.volume, 1_000);
  });

  it("drain 은 바뀐 봉만 낸다 — 두 번째는 비어 있다", () => {
    const b = new KrMinuteBarBuilder();
    b.add(tick("10:00:01", 100, 1));
    assert.equal(b.drain(new Date("2026-10-07T01:00:30Z")).length, 1);
    assert.equal(b.drain(new Date("2026-10-07T01:00:31Z")).length, 0);
  });
});

describe("krMinutesToFiveMinute — KIS 1분봉 → 5분봉 (장 마감 보정 · 백필)", () => {
  const m = (hhmm: string, o: number, h: number, l: number, c: number, v: number) => ({
    open: o, high: h, low: l, close: c, volume: v, timestamp: new Date(`2026-10-06T${hhmm}:00+09:00`),
  });

  it("1분봉 다섯을 묶고 순서가 섞여 와도 시가 · 종가가 맞다 · 15:30 은 15:25 로", () => {
    const bars = krMinutesToFiveMinute([
      m("09:04", 103, 104, 102, 104, 4),
      m("09:00", 100, 101, 99, 100, 1),
      m("09:02", 100, 105, 98, 103, 3),
      m("15:19", 271, 272, 270, 271, 5),
      m("15:30", 272, 272, 272, 272, 1427),
      m("15:40", 272, 272, 272, 272, 9),
    ]);
    assert.equal(bars.length, 3);
    assert.deepEqual([bars[0].open, bars[0].high, bars[0].low, bars[0].close, bars[0].volume], [100, 105, 98, 104, 8]);
    assert.equal(bars[0].timestamp.toISOString(), "2026-10-06T00:00:00.000Z");
    assert.equal(bars[2].timestamp.toISOString(), "2026-10-06T06:25:00.000Z");
    assert.equal(bars[2].close, 272);
  });
});
