import { style } from "@vanilla-extract/css";
import { vars } from "../../../styles/tokens.css.ts";
export const H3Typography = style({
  color: vars.colors.text.nickname,
  fontSize: vars.fontSizes.heading3,
  fontWeight: vars.fontWeights.semibold,
});
