import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Wrapper = style({
  padding: "12px",
  width: "75%",
  height: "300px",
  overflowY: "scroll",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",

  gap: "20px",
  background: vars.colors.background.primary,
});
