import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css.ts";
export const Wrapper = style({
  width: "100%",
  height: "60px",
  borderRadius: "10px",
  background: vars.colors.background.submit,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "#ffffff",
  border: "none",
  fontSize: vars.fontSizes.heading2,
  fontWeight: vars.fontWeights.semibold,
});
