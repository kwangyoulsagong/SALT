import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  fontFamily: vars.fontFamily.base,
});

export const allRowStyles = style({
  display: "flex",
  alignItems: "center",
  minHeight: "56px",
  padding: `0 ${vars.space.xs}`,
  fontSize: vars.typography.t5.fontSize,
  fontWeight: vars.fontWeights.bold,
});

export const listStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  margin: 0,
  padding: `${vars.space.md} ${vars.space.xs}`,
  listStyle: "none",
  boxShadow: `inset 0 1px 0 ${vars.colors.border.light}`,
});

export const itemRowStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const requiredStyles = style({
  color: vars.colors.brand.primary,
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.semibold,
});

export const detailSlotStyles = style({
  marginLeft: "auto",
  flexShrink: 0,
});
