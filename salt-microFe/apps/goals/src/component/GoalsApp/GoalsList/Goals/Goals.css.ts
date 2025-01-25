import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Wrapper = style({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "5px",
  listStyle: "none",
});
export const H2Typography = style({
  color: vars.colors.text.nickname,
  fontSize: vars.fontSizes.heading2,
  fontWeight: vars.fontWeights.bold,
});
export const pList = style({
  fontSize: vars.fontSizes.small,
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.text.primary,
});
