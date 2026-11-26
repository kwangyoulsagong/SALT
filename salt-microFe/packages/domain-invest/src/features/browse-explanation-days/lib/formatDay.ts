import { EXPLANATION_DAYS_MESSAGES as M } from "../model/messages";

/**
 * `YYYY-MM-DD`(KST 날짜, 서버 값) → `11/25(화)`. 지금 시각을 읽지 않는다 — 같은 입력이면 서버 · 브라우저가 같은 글자(수화 안전)
 */
export const formatTradeDay = (tradeDay: string): string => {
  const [y, m, d] = tradeDay.split("-").map(Number);
  if (!y || !m || !d) return tradeDay;
  const weekday = M.weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "";
  return M.day(`${m}/${d}`, weekday);
};

/** 서버 등락률(%) → `+2.23%` · `−9.87%`(진짜 빼기 기호). 0 은 부호 없이 */
export const formatPercent = (percent: number): string => {
  const fixed = Math.abs(percent).toFixed(2);
  if (Number(fixed) === 0) return "0.00%";
  return percent > 0 ? `+${fixed}%` : `−${fixed}%`;
};
