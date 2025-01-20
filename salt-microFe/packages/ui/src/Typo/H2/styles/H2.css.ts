import { style } from "@vanilla-extract/css";
import { vars } from "../../../styles/tokens.css";
export const H2Typography = style({
  color: vars.colors.text.nickname,
  fontSize: vars.fontSizes.heading2,
  fontWeight: vars.fontWeights.bold,
});
