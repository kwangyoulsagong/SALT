import { globalStyle } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

globalStyle("*", {
  margin: 0,
  padding: 0,
  boxSizing: "border-box",
});

globalStyle("body", {
  background: vars.colors.background.primary,
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
});
