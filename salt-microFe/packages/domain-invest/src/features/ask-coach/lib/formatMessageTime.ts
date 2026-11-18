/** 서울 시각 "11. 18. 14:05" — 대화 행 · 카드의 생성 시각(FEATURE-006 FR-27). 서버가 준 ISO 를 클라이언트가 포맷한다 */
const formatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

/** 깨진 시각은 빈 문자열(화면은 그 줄을 그리지 않는다) */
export const formatMessageTime = (iso: string | null): string => {
  if (!iso) return "";
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "" : formatter.format(at);
};
