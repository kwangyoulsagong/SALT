import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css.ts";

const base = style({
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

export const sizeVariants = styleVariants({
  sm: [
    base,
    {
      width: "100px",
      height: "40px",
    },
  ],
  lg: [base, { width: "100%", height: "60px" }],
});
