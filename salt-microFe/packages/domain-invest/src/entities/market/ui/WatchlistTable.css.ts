import { style } from "@vanilla-extract/css";

/** 종목 이름 링크 — 글자 모양은 그대로, 밑줄은 hover · 키보드 포커스 때만 */
export const nameLink = style({
  color: "inherit",
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
  ":focus-visible": { textDecoration: "underline" },
});
