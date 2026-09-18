/** 분·시간·일의 밀리초. */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * 상대 시각 **표시** 포맷 (`FE-REQ-010` FR-43).
 *
 * 서버가 준 ISO 문자열을 **클라이언트가** 포맷한다. 서버에서 만들면 응답이 캐시되는
 * 순간 "3시간 전"이 굳어 버리고, SSR 이면 서버와 브라우저의 시각 차이가 그대로
 * 하이드레이션 불일치가 된다 (`ssr.md`).
 *
 * 미래 시각은 "방금 전"으로 본다 — 발행 시각이 약간 앞선 기사가 실제로 온다.
 */
export const formatRelativeTime = (
  isoDate: string,
  now: Date = new Date(),
): string => {
  const at = new Date(isoDate);
  if (Number.isNaN(at.getTime())) return "";

  const elapsed = now.getTime() - at.getTime();
  if (elapsed < MINUTE) return "방금 전";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  return `${Math.floor(elapsed / DAY)}일 전`;
};
