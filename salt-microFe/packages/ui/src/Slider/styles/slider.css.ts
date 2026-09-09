import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  width: "100%",
  fontFamily: vars.fontFamily.base,
});

export const headerStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.md,
});

export const labelStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const valueStyles = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
});

export const rangeStyles = style({
  width: "100%",
  height: "24px",
  margin: 0,
  // accentColor를 쓰면 브라우저 기본 트랙·썸·포커스 링을 그대로 유지한다.
  accentColor: vars.colors.brand.primary,
  cursor: "pointer",

  selectors: {
    "&:disabled": {
      opacity: 0.4,
      cursor: "not-allowed",
    },
  },
});

export const inputStyles = style({
  width: "96px",
  height: "36px",
  padding: `0 ${vars.space.md}`,
  border: `1px solid ${vars.colors.border.light}`,
  borderRadius: vars.radius.button.sm,
  background: vars.colors.background.white,
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.typography.t6.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
  textAlign: "right",

  selectors: {
    "&:disabled": {
      opacity: 0.4,
    },
  },
});

export const boundsStyles = style({
  display: "flex",
  justifyContent: "space-between",
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  fontVariantNumeric: vars.numeric.tabular,
});
