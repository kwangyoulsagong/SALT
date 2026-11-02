import { style } from "@vanilla-extract/css";

/** 머리 · 본문 사이 간격 — 본문 안의 패널 간격(16)과 같다 */
export const detailStack = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
  paddingTop: "8px",
});
