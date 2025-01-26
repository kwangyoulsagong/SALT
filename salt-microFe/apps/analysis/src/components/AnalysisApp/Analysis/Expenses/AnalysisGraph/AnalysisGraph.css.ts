import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Wrapper = style({
  display: "flex",
  justifyContent: "center",
  gap: "7px",
  paddingRight: "8%",
});
export const graphsContainer = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "5px",
});
export const graphsWrapper = style({
  width: "20px",
  height: "45px",
  background: "#D9D9D9",
  borderRadius: "5px",
  display: "flex",
  justifyContent: "center",
  alignItems: "end",
});
export const bars = style({
  width: "20px",
  background: "#15AABF",
  borderRadius: "5px",
});
export const category = style({
  fontSize: "10px",
  fontWeight: vars.fontWeights.bold,
});
