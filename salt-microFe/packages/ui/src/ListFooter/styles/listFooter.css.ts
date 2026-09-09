import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const footerStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.sm,
  width: "100%",
  minHeight: "52px",
  padding: `${vars.space.md} ${vars.space.lg2}`,
  background: vars.colors.background.white,
  boxShadow: `inset 0 1px 0 ${vars.colors.border.light}`,
  fontFamily: vars.fontFamily.base,
});

export const captionStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontVariantNumeric: vars.numeric.tabular,
});
