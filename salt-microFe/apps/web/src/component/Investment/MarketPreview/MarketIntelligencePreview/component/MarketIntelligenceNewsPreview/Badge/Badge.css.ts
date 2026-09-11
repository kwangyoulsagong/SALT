import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";

export const BadgeStyle = style({
  borderRadius: "4px",
  backgroundColor: vars.colors.background.primary,
  padding: "4px 6px",
  display: "flex",
  justifyContent: "center",
  alignItems: "cetner",
});

export const BadgeFontStyle = style({
  color: vars.colors.text.primary,
  fontSize: vars.fontSizes.small,
  fontWeight: vars.fontWeights.bold,
});
