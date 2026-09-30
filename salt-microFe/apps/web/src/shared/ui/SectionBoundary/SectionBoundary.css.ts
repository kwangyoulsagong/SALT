import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** 인라인 하드코딩 색(#e5e7eb · #111827)을 토큰으로 옮겼다 (FE-REQ-044 P-14) */
export const statusBox = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  width: "100%",
  padding: vars.space.lg,
  border: `1px solid ${vars.colors.border.light}`,
  borderRadius: vars.radius.base,
  color: vars.colors.text.primary,
});

export const statusTitle = style({
  fontSize: vars.typography.t6.fontSize,
  fontWeight: vars.fontWeights.semibold,
});

export const statusDescription = style({
  margin: `${vars.space.xs} 0 0`,
  color: vars.colors.text.lightGray,
  fontSize: vars.typography.t7.fontSize,
});
