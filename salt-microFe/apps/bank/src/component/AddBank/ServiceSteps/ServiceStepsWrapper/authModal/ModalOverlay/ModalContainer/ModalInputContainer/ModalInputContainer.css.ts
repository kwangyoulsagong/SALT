import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Container = style({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "30px",
});
export const Label = style({
  color: "#000000",
  fontWeight: vars.fontWeights.semibold,
});
