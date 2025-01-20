import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Wrapper = style({
  width: "100px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "5px",
});

export const Name = style({
  color: vars.colors.text.nickname,
  fontSize: vars.fontSizes.heading3,
  fontWeight: vars.fontWeights.semibold,
});

export const Email = style({
  color: vars.colors.text.email,
  fontSize: vars.fontSizes.body,
});
