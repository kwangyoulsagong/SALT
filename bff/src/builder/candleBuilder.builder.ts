type Timeframe = "1m" | "5m" | "1h";

interface Candle {
  timestamp: number; // 봉 시작 시간 (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class CandleBuilder {
  private candles: Map<string, Record<Timeframe, Candle[]>> = new Map();

  update(symbol: string, price: number, volume: number) {
    return {
      "1m": this.updateTimeframe(symbol, price, volume, "1m"),
      "5m": this.updateTimeframe(symbol, price, volume, "5m"),
      "1h": this.updateTimeframe(symbol, price, volume, "1h"),
    };
  }

  private updateTimeframe(
    symbol: string,
    price: number,
    volume: number,
    tf: Timeframe
  ) {
    const bucketTime = this.getBucketTime(tf);

    if (!this.candles.has(symbol)) {
      this.candles.set(symbol, { "1m": [], "5m": [], "1h": [] });
    }

    const arr = this.candles.get(symbol)![tf];
    let last = arr[arr.length - 1];

    if (!last || last.timestamp !== bucketTime) {
      arr.push({
        timestamp: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume,
      });
    } else {
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
      last.volume += volume;
    }

    if (arr.length > 500) arr.shift();

    return arr[arr.length - 1]; // <=== ★ return last candle
  }

  private getBucketTime(tf: Timeframe): number {
    const now = new Date();
    if (tf === "1m") return now.setSeconds(0, 0);
    if (tf === "5m")
      return now.setMinutes(Math.floor(now.getMinutes() / 5) * 5, 0, 0);
    return now.setMinutes(0, 0, 0); // 1h fallback
  }

  get(symbol: string, tf: Timeframe) {
    return this.candles.get(symbol)?.[tf] ?? [];
  }
}

export const candleBuilder = new CandleBuilder();
