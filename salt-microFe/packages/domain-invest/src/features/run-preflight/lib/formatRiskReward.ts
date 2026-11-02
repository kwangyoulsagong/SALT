/**
 * 손익비(서버가 소수 2자리로 준다) → `1.45`. 공용 `formatTimes` 는 1자리라 1.45 가 `1.5` 로 보여
 * "최소 기준보다 낮다"는 경고와 숫자가 서로 어긋난다 — 서버 자릿수 그대로 둔다.
 */
const riskRewardFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

export const formatRiskReward = (ratio: number): string => riskRewardFormatter.format(ratio);
