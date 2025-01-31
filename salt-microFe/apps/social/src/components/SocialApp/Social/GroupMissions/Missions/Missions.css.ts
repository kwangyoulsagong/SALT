import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Wrapper = style({
  width: "45%",
  height: "64px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "5px",
  borderRadius: "10px",
  background: vars.colors.background.third,
  paddingLeft: "2%",
  paddingRight: "2%",
});
