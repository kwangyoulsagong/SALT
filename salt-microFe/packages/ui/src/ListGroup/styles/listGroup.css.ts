import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const listGroupStyles = style({
  width: "100%",
  background: vars.colors.background.white,
});

export const headerStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  minHeight: "48px",
  padding: `${vars.space.md} ${vars.space.lg2} ${vars.space.sm}`,
});

export const titleStyles = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.bold,
});

export const countStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontVariantNumeric: vars.numeric.tabular,
});

export const actionStyles = style({
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
});
