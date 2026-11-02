const dateParts = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

/**
 * "11.03(화)" — 서울 날짜(F008 슬라이스 24 일정 줄에서 옮김, `FE-REQ-050` FR-4). `Intl` 기본 모양("11. 03. (화)")은 띄어쓰기가
 * 많아 좁은 칸에 안 들어간다. 표시 전용 — 남은 날은 서버 `daysUntil` 을 쓴다
 */
export const formatKrScheduleDate = (iso: string): string => {
  const parts = Object.fromEntries(dateParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.month}.${parts.day}(${parts.weekday})`;
};
