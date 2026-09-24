import { style } from "@vanilla-extract/css";

/** "이어서 하기" 링크 — 다른 화면(온보딩)으로 가므로 셰브론을 글자와 한 줄에 둔다. */
export const ctaLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
});
