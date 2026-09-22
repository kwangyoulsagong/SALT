/** 천 단위 구분. `decimals` 자리까지 */
export const formatNumber = (value: number, decimals = 0): string =>
  value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** 가격 자릿수 — 1원 미만 코인은 유효숫자 4자리까지 */
export const priceDecimals = (price: number): number => {
  const abs = Math.abs(price);
  if (abs >= 100) return 0;
  if (abs >= 1) return 2;
  if (abs === 0) return 0;
  return Math.min(8, Math.ceil(-Math.log10(abs)) + 3);
};

export const formatPrice = (price: number): string => formatNumber(price, priceDecimals(price));

/** 거래량 축약 — K · M · B (`FE-REQ-034` FR-4) */
export const formatCompact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return formatNumber(value, abs < 10 ? 2 : 0);
};

/** 등락률 — 부호 문자(U+2212)와 함께. 색만으로 부호를 주지 않는다 */
export const formatSignedPercent = (ratio: number): string => {
  const percent = (ratio * 100).toFixed(2);
  if (Number(percent) === 0) return "0.00%";
  return ratio > 0 ? `+${percent}%` : `−${percent.slice(1)}%`;
};
