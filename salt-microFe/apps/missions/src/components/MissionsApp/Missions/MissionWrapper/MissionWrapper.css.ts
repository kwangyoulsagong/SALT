import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Wrapper = style({
  width: "100%",
  height: "35px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: "10px",
  background: vars.colors.background.secondary,
  paddingLeft: "7%",
  paddingRight: "7%",
});
export const Points = style({
  color: "#339AF0",
  fontSize: "13px",
});
