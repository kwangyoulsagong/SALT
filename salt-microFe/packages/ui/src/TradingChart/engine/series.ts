import type { TradingCandle } from "../types";
import { simpleMovingAverage } from "./indicators";

/**
 * 봉 배열 → 열 배열. 그리기 루프가 객체 필드를 매번 찾지 않게 한 번 편다.
 * 이동평균도 여기서 **데이터가 바뀔 때 한 번만** 계산한다 — 뷰포트 · 포인터가 바뀔 때 다시 하지 않는다.
 */
export interface ChartSeries {
  length: number;
  time: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  volume: Float64Array;
  movingAverages: Array<{ period: number; values: Float64Array }>;
  volumeAverage: Float64Array;
}

export const VOLUME_AVERAGE_PERIOD = 20;

export const buildSeries = (
  candles: readonly TradingCandle[],
  periods: readonly number[],
): ChartSeries => {
  const n = candles.length;
  const time = new Float64Array(n);
  const open = new Float64Array(n);
  const high = new Float64Array(n);
  const low = new Float64Array(n);
  const close = new Float64Array(n);
  const volume = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const candle = candles[i]!;
    time[i] = candle.time;
    open[i] = candle.open;
    high[i] = candle.high;
    low[i] = candle.low;
    close[i] = candle.close;
    volume[i] = candle.volume;
  }
  return {
    length: n,
    time,
    open,
    high,
    low,
    close,
    volume,
    movingAverages: periods.map((period) => ({ period, values: simpleMovingAverage(close, period) })),
    volumeAverage: simpleMovingAverage(volume, VOLUME_AVERAGE_PERIOD),
  };
};

/** 범위 안 최고 고가 · 최저 저가 봉 */
export const extremaIndices = (
  series: ChartSeries,
  from: number,
  to: number,
): { high: number; low: number } => {
  let high = from;
  let low = from;
  for (let i = from + 1; i <= to; i += 1) {
    if (series.high[i]! > series.high[high]!) high = i;
    if (series.low[i]! < series.low[low]!) low = i;
  }
  return { high, low };
};
