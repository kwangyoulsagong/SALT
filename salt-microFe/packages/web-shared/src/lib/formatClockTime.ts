/**
 * 시:분 **표시** 포맷 (24시간).
 *
 * **클라이언트에서만 부른다.** 서버와 브라우저의 타임존이 다르면 같은 시각이 다른
 * 문자열이 되고 그게 하이드레이션 불일치다 (`ssr.md`). 이 함수를 쓰는 화면은
 * `ssr:false` 이거나 effect 안이어야 한다.
 */
const formatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatClockTime = (value: Date): string => formatter.format(value);

const seoulFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

/**
 * 시:분 — **서울 시각으로 고정.** 서버 컴포넌트에서 쓴다: 서버 타임존(배포 환경은 UTC 일 수 있다)과
 * 무관하게 같은 글자가 나온다. 서비스 대상이 국내 원화 시세라 서울 시각이 기준이다.
 */
export const formatSeoulClockTime = (value: Date): string => seoulFormatter.format(value);
