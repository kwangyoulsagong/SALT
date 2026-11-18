import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 아래 "내 보유" 패널과 띄운다 — 두 위젯이 형제로 놓인다 */
export const stack = style({ display: "grid", gap: 16, marginBottom: 16 });

export const emptyLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  color: vars.colors.text.secondary,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  ":hover": { color: vars.colors.text.primary },
});
