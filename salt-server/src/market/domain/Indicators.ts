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
