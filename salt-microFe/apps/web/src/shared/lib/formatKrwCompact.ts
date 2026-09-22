const formatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

const UNITS = [
  { size: 1e12, suffix: "조" },
  { size: 1e8, suffix: "억" },
  { size: 1e4, suffix: "만" },
] as const;

/**
 * 큰 금액을 단위로 줄여 **표시**한다 — `329,841,579,458` → `3,298.4억`. 좁은 칸의 거래대금용이다.
 * 값을 바꾸는 계산이 아니라 자릿수 표기다(계산은 서버, `fsd-shared.md`). 1만 미만은 그대로.
 */
export const formatKrwCompact = (value: number): string => {
  const abs = Math.abs(value);
  const unit = UNITS.find(({ size }) => abs >= size);
  return unit ? `${formatter.format(value / unit.size)}${unit.suffix}` : formatter.format(value);
};
