/** 눈금 간격 후보 — 1 · 2 · 2.5 · 5 × 10ⁿ (`FE-REQ-034` FR-4) */
const NICE_STEPS = [1, 2, 2.5, 5, 10];

/** `span` 을 `targetCount` 칸 안팎으로 나누는 보기 좋은 간격 */
export const niceStep = (span: number, targetCount: number): number => {
  if (!(span > 0) || targetCount <= 0) return 1;
  const raw = span / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step = NICE_STEPS.find((candidate) => candidate >= normalized) ?? 10;
  return step * magnitude;
};

/** `[min, max]` 안의 눈금 값들 — 간격의 배수만 */
export const niceTicks = (min: number, max: number, targetCount: number): number[] => {
  if (!(max > min)) return [];
  const step = niceStep(max - min, targetCount);
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  // 부동소수 누적 오차를 피하려고 곱으로 만든다
  for (let i = 0; first + i * step <= max + step * 1e-9; i += 1) {
    ticks.push(Number((first + i * step).toPrecision(12)));
  }
  return ticks;
};

/** 간격이 소수면 그만큼 자릿수를 보인다(1원 미만 코인). 최대 8자리 */
export const decimalsForStep = (step: number): number =>
  step >= 1 ? 0 : Math.min(8, Math.ceil(-Math.log10(step) - 1e-9));

export interface LinearScale {
  toY: (value: number) => number;
  fromY: (y: number) => number;
}

/** 값 → y. 위가 큰 값이다. `min === max` 면 가운데 한 줄 */
export const linearScale = (
  min: number,
  max: number,
  top: number,
  bottom: number,
): LinearScale => {
  const span = max - min || 1;
  const height = bottom - top;
  return {
    toY: (value) => bottom - ((value - min) / span) * height,
    fromY: (y) => min + ((bottom - y) / height) * span,
  };
};

/** 보이는 봉의 저가~고가 + 위아래 여백 (`FE-REQ-034` FR-9 — 가격선 · 이동평균은 넣지 않는다) */
export const priceExtent = (
  lows: ArrayLike<number>,
  highs: ArrayLike<number>,
  from: number,
  to: number,
  paddingRatio: number,
): { min: number; max: number } => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = from; i <= to; i += 1) {
    if (lows[i]! < min) min = lows[i]!;
    if (highs[i]! > max) max = highs[i]!;
  }
  if (!Number.isFinite(min)) return { min: 0, max: 1 };
  if (min === max) {
    const pad = Math.abs(min) * 0.01 || 1;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * paddingRatio;
  return { min: min - pad, max: max + pad };
};
