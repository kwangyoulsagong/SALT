/** 서버가 준 날짜(YYYY-MM-DD · ISO 시각) → "2026년 11월 5일". 계산 없음 — 글자만 바꾼다(시간대 변환 0) */
export const formatTipDate = (value: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${Number(m[1])}년 ${Number(m[2])}월 ${Number(m[3])}일` : value;
};
