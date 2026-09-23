import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const wrap = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: vars.space.xs,
});

export const hint = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  fontVariantNumeric: vars.numeric.tabular,
  textAlign: "right",
});
