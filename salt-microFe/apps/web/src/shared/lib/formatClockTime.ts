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
