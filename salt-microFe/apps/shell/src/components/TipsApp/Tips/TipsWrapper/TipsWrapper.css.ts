import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Wrapper = style({
  width: "100%",
  height: "55px",
  borderRadius: "10px",
  background: vars.colors.background.third,
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  gap: "2px",
  paddingLeft: "8%",
  paddingRight: "8%",
});
