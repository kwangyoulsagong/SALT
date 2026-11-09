import { style } from "@vanilla-extract/css";

/** 오늘 소식 목록 — 행(`NewsRow`)이 자기 여백 · 호버 면을 갖는다. 카드 안쪽 여백과 행 여백이 겹치지 않게 좌우로 당긴다 */
export const newsList = style({
  display: "flex",
  flexDirection: "column",
  margin: "0 -12px",
  minWidth: 0,
});
