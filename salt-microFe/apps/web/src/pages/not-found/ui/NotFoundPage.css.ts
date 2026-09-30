import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

export const page = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "70vh",
  background: `linear-gradient(180deg, ${vars.colors.graphic.backdrop} 0%, ${vars.colors.background.white} 60%)`,
});

export const link = style({
  display: "inline-flex",
  alignItems: "center",
  height: "40px",
  padding: `0 ${vars.space.lg}`,
  borderRadius: vars.radius.button.md,
  background: vars.colors.brand.primary,
  color: vars.colors.text.white,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
});
