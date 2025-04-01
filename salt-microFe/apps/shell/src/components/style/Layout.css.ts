import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";

export const Container = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100vh",
  background: vars.colors.background.primary,
});
