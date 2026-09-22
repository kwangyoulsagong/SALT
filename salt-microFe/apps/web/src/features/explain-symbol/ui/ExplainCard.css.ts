import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
});

export const cardHeader = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.sm,
});

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
});

export const list = style({
  margin: 0,
  paddingLeft: vars.space.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  color: vars.colors.text.secondary,
  fontSize: vars.fontSizes.base,
  lineHeight: 1.5,
});

export const note = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.fontSizes.sm,
  lineHeight: 1.5,
});
