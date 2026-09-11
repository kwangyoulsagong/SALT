import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

globalStyle("*", {
  margin: 0,
  padding: 0,
  boxSizing: "border-box",
});

globalStyle("body", {
  background: vars.colors.background.primary,
  color: vars.colors.text.primary,
  fontSize: vars.fontSizes.body,
  fontWeight: vars.fontWeights.regular,
});
