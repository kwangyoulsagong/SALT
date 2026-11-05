const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 서버가 준 날짜 → "2026년 11월 5일".
 * - 날짜(YYYY-MM-DD — 작성일 · 유효기한)는 글자만 바꾼다
 * - 시각(ISO `…T…Z` — 이력 · 카드 모은 때)은 **한국 날짜로** — 앞 열 글자는 UTC 날짜라 KST 0~9시가 하루 앞으로 보였다(2026-11-05 S2b).
 *   고정 오프셋 더하기라 서버 · 브라우저가 같은 글자를 낸다(지금 시각 · 사용자 시간대를 읽지 않는다 — 수화 갈림 0)
 */
export const formatTipDate = (value: string): string => {
  const instant = value.includes("T") ? Date.parse(value) : Number.NaN;
  if (!Number.isNaN(instant)) {
    const kst = new Date(instant + KST_OFFSET_MS);
    return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${Number(m[1])}년 ${Number(m[2])}월 ${Number(m[3])}일` : value;
};
