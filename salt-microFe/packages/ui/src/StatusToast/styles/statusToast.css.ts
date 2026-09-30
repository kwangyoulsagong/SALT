import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const statusToastStyles = style({
  position: "absolute",
  top: vars.space.md,
  left: "50%",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.lg} ${vars.space.sm} ${vars.space.sm}`,
  borderRadius: vars.radius.full,
  background: vars.colors.background.white,
  boxShadow: vars.elevation.md,
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  whiteSpace: "nowrap",
  pointerEvents: "none",
});
