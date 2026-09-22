/**
 * 단순이동평균 — O(n) 누적합. 표본이 기간보다 적은 앞부분은 `NaN`(그리지 않는다, `FE-REQ-034` FR-2).
 *
 * 표시용 가격 변환이다. 결과를 판단 · 금액에 쓰지 않는다(REQ Open Question).
 */
export const simpleMovingAverage = (
  values: ArrayLike<number>,
  period: number,
): Float64Array => {
  const out = new Float64Array(values.length).fill(Number.NaN);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
};
