import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const descriptionStyles = style({
  margin: 0,
  color: vars.colors.neutral[700],
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  wordBreak: "keep-all",
});
