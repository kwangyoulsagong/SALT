/**
 * 기술 지표 — `technical-indicator.service` 에서 옮겨온 **순수 계산**.
 *
 * ## 원문의 산술을 바꾸지 않았다
 *
 * `calculateRSI` 는 **단순 평균 RSI** 이고 Wilder 평활을 쓰지 않는다. 또 `losses` 가 0 일 때
 * `gains / (losses || 1)` 로 나눈다 — 상승만 있는 구간에서 RSI 가 100 이 아니라
 * `100 - 100/(1+gains)` 가 된다. **둘 다 원문 그대로 두고 테스트로 고정했다.**
 * 지표 정의를 고치는 것은 이관이 아니라 판단이 필요한 변경이고, 그 판단은
 * 근거(과거 적중률)를 가진 쪽에서 해야 한다.
 */

/** 마지막 `period` 개의 단순 이동평균. 입력이 period 보다 짧으면 분모가 그대로 period 다(원문). */
export const movingAverage = (values: number[], period: number): number => {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
};

/** 단순 평균 RSI. 값 배열은 **오래된 것이 앞**이다. */
export const relativeStrengthIndex = (
  values: number[],
  period: number
): number => {
  let gains = 0;
  let losses = 0;

  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
};

/**
 * 지표마다 필요한 최소 봉 수(`SRV-REQ-057` FR-1). 모자란 지표만 `null` 이다.
 *
 * 예전엔 한 벌 전체를 50봉 문턱(MA50 몫)으로 버렸다 — 원화 마켓이 생긴 지 6~44일인 코인 14개가 RSI(15봉이면 된다)까지 잃었다
 * (2026-11-10 실측 — 수집 누락이 아니라 거래소 이력 자체가 짧았다). MACD 는 EMA26 + 신호선 EMA9 가 다 차는 35.
 */
export const INDICATOR_MIN_CANDLES = {
  rsi14: 15,
  ma20: 20,
  volumeAvg20: 20,
  macd: 35,
  ma50: 50,
} as const;

/** 한 벌이라도 만들 수 있는 최소 봉 수 — 가장 짧은 지표(RSI14)의 몫. 이보다 적으면 쓰지 않는다 */
export const MIN_CANDLES_FOR_INDICATORS = INDICATOR_MIN_CANDLES.rsi14;

export interface IndicatorSet {
  rsi14: number | null;
  ma20: number | null;
  ma50: number | null;
  volumeAvg20: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
}

/** 지수 이동평균 열 — 첫 값은 앞 `period` 개의 단순 평균. 입력보다 `period - 1` 개 짧다 */
const emaSeries = (values: number[], period: number): number[] => {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const out = [ema];
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
};

/** MACD(12, 26, 9) — 값 배열은 오래된 것이 앞. 모자라면 `null` */
export const macdOf = (
  values: number[]
): { macd: number; signal: number; hist: number } | null => {
  if (values.length < INDICATOR_MIN_CANDLES.macd) return null;
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  // 두 열의 끝을 맞춘다 — fast 가 14개 더 길다
  const line = slow.map((value, i) => fast[i + 14] - value);
  const signal = emaSeries(line, 9);
  const lastLine = line[line.length - 1];
  const lastSignal = signal[signal.length - 1];
  return { macd: lastLine, signal: lastSignal, hist: lastLine - lastSignal };
};

/** 종가·거래량 배열(오래된 것이 앞)에서 지표 한 벌을 만든다. 봉이 모자란 지표만 `null` */
export const calculateIndicators = (
  closes: number[],
  volumes: number[]
): IndicatorSet => {
  const has = (key: keyof typeof INDICATOR_MIN_CANDLES) => closes.length >= INDICATOR_MIN_CANDLES[key];
  const m = macdOf(closes);
  return {
    rsi14: has("rsi14") ? relativeStrengthIndex(closes, 14) : null,
    ma20: has("ma20") ? movingAverage(closes, 20) : null,
    ma50: has("ma50") ? movingAverage(closes, 50) : null,
    volumeAvg20: volumes.length >= INDICATOR_MIN_CANDLES.volumeAvg20 ? movingAverage(volumes, 20) : null,
    macd: m?.macd ?? null,
    macdSignal: m?.signal ?? null,
    macdHist: m?.hist ?? null,
  };
};

/** 집계에 필요한 캔들 모양 — `ports.Candle` 과 같다. 도메인 안에서 순환 import 를 피하려고 여기 적는다. */
export interface CandleBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  timestamp: Date;
}

/**
 * 짧은 봉을 긴 봉으로 묶는다 — 1시간봉 지표용(F010 슬라이스 0).
 *
 * 1시간 캔들은 수집하지 않는다(`SyncMarketData` 는 5분 · 1일만). 단타 판단(24시간)에 5분봉 RSI 는 잡음이고
 * 일봉은 너무 느려서, 5분봉 12개를 시각 버킷으로 묶어 1시간봉을 만든다. 입력 · 출력 모두 **최신이 앞**이다.
 * 마지막(가장 새) 버킷은 진행 중일 수 있다 — 원문 지표 계산도 진행 중인 마지막 봉을 그대로 썼다.
 */
export const aggregateCandles = <T extends CandleBar>(
  candles: T[],
  bucketMs: number
): CandleBar[] => {
  const buckets = new Map<number, CandleBar>();
  // 오래된 것부터 넣어야 open 이 첫 봉, close 가 마지막 봉이 된다
  for (const candle of [...candles].reverse()) {
    const key = Math.floor(candle.timestamp.getTime() / bucketMs) * bucketMs;
    const bucket = buckets.get(key);
    if (!bucket) {
      buckets.set(key, { ...candle, timestamp: new Date(key) });
      continue;
    }
    bucket.high = Math.max(bucket.high, candle.high);
    bucket.low = Math.min(bucket.low, candle.low);
    bucket.close = candle.close;
    bucket.volume =
      bucket.volume === null && candle.volume === null
        ? null
        : (bucket.volume ?? 0) + (candle.volume ?? 0);
  }
  return [...buckets.values()].reverse();
};
