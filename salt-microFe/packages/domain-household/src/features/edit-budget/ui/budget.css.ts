import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 예산 편집(`FE-REQ-060` FR-7) — 봉투 목록 행 · 입력 오른쪽 160 · 저장 32. 글자는 다섯 단 토큰만 */
export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" });

export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minHeight: "44px",
  padding: "6px 8px",
  borderRadius: "8px",
  boxShadow: `inset 0 -1px 0 ${vars.colors.desk.line}`,
});

export const rowMain = style({ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 });

export const rowTitle = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const rowCaption = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
});

export const rowInput = style({ width: "160px", flexShrink: 0 });

export const incomeInput = style({ maxWidth: "240px" });

export const total = style({
  margin: 0,
  padding: "0 8px",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});

export const submit = style({ alignSelf: "flex-start" });

export const note = style({
  margin: 0,
  minHeight: "16px",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});
