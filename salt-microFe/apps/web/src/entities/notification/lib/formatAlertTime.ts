/**
 * 알림 시각 — "11월 18일 14:05", **서울 시각 고정**. 서버 컴포넌트(첫 쪽)와 브라우저(다음 쪽)가 같은 글자를 내야 수화가 갈리지 않는다(`ssr.md`).
 * 상대 시각("3시간 전")은 지금 시각을 렌더 중에 읽어야 해서 쓰지 않는다(`@repo/fsd/no-render-read`).
 */
const formatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

export const formatAlertTime = (iso: string): string => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "" : formatter.format(at);
};
