import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 투자 오른쪽 사이드(`FE-REQ-047` FR-7) — 관심 종목 목록. 글자는 데스크톱 단 토큰만 */
export const stack = style({ display: "flex", flexDirection: "column", gap: vars.space.lg });

export const headLink = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  minHeight: "36px",
  color: vars.colors.desk.text1,
  textDecoration: "none",
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px", borderRadius: "8px" },
});

export const list = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  minHeight: "44px",
  padding: `0 ${vars.space.sm}`,
  borderRadius: "8px",
  color: vars.colors.desk.text1,
  textDecoration: "none",
  ":hover": { background: vars.colors.desk.line },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
});

export const name = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
});

export const rate = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  fontVariantNumeric: "tabular-nums",
});

export const up = style({ color: vars.colors.special.up });
export const down = style({ color: vars.colors.special.down });
export const flat = style({ color: vars.colors.desk.text2 });

export const note = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});
