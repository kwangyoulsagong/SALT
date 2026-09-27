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

/** 지표 계산에 필요한 최소 캔들 수. 이보다 적으면 계산하지 않는다(원문). */
export const MIN_CANDLES_FOR_INDICATORS = 50;

export interface IndicatorSet {
  rsi14: number;
  ma20: number;
  ma50: number;
  volumeAvg20: number;
}

/** 종가·거래량 배열(오래된 것이 앞)에서 지표 한 벌을 만든다. */
export const calculateIndicators = (
  closes: number[],
  volumes: number[]
): IndicatorSet => ({
  rsi14: relativeStrengthIndex(closes, 14),
  ma20: movingAverage(closes, 20),
  ma50: movingAverage(closes, 50),
  volumeAvg20: movingAverage(volumes, 20),
});

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
