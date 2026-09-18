import { style } from "@vanilla-extract/css";

/**
 * 프리뷰 패널의 **높이를 고정**한다.
 *
 * 값이 `ScrollContainer maxHeight="2xl"`(800px)과 같다 — 아래쪽 한도와 위쪽 한도가
 * 같으면 내용이 무엇이든 패널 높이가 변하지 않는다.
 *
 * ## 왜 필요한가
 *
 * 이 패널은 테이블 행 hover 로 심볼이 바뀐다. 내용(차트·지표·뉴스)의 높이가 심볼마다
 * 다르고 로딩 중에는 0 에 가까워서, hover 할 때마다 **페이지 전체 높이가 출렁였다.**
 * 그러면 세로 스크롤바가 생겼다 사라지고 그 폭만큼 **왼쪽 테이블이 좌우로 밀린다** —
 * "호버할 때 테이블이 움직인다"의 원인이다.
 *
 * `minHeight` 만으로 충분한 이유: 내용이 더 길면 `ScrollContainer` 가 800px 에서 잘라
 * 스크롤로 넘긴다. 두 값이 같아서 늘어날 자리가 없다.
 */
export const previewPanel = style({
  minHeight: "800px",
});
