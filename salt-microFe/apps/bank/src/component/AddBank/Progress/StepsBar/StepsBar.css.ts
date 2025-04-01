import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Bar = style({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
});
export const Typo = style({
  fontWeight: vars.fontWeights.semibold,
  fontSize: vars.fontSizes.small,
});
