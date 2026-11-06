import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 제목 목록 — 줄마다 위: 시각 · 제공처 · 공시/시황 칩, 아래: 제목. 좁은 화면에서도 한 열 */
export const list = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
});

export const item = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "10px 0",
  borderBottom: `1px solid ${vars.colors.border.light}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
  minWidth: 0,
});

export const meta = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "6px",
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.lightGray,
  fontVariantNumeric: "tabular-nums",
});

/** 제목 — 링크가 아니다(원천에 없다). 긴 제목은 줄바꿈(넘침 0) */
export const titleText = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  color: vars.colors.text.primary,
  overflowWrap: "anywhere",
});
