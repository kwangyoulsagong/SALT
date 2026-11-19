import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 대화 옆 고정 칸(2026-11-19 — 끌어서 옮기던 격자 대신). 묶음 제목 13/600 · 끝에 다른 화면으로 가는 줄 */
export const block = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });

export const blockTitle = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const policy = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/** 다른 페이지로 가는 줄 — 폭 100% · 오른쪽 셰브론(done 체크리스트 2절 6) */
export const detailLink = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  minHeight: "36px",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px", borderRadius: "6px" },
});
