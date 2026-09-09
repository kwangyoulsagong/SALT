import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  width: "100%",
  padding: `${vars.space.xl} ${vars.space.lg2} ${vars.space["2xl"]}`,
  background: vars.colors.neutral[50],
  fontFamily: vars.fontFamily.base,
});

export const titleStyles = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  fontWeight: vars.fontWeights.bold,
});

export const listStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  margin: 0,
  paddingLeft: vars.space.md,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  wordBreak: "keep-all",
});
