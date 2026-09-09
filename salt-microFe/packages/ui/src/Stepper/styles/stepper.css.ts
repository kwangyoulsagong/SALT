import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  fontFamily: vars.fontFamily.base,
});

export const labelStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const controlStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.xs,
    border: `1px solid ${vars.colors.border.light}`,
    borderRadius: vars.radius.button.md,
    background: vars.colors.background.white,

    selectors: {
      "&:focus-within": {
        borderColor: vars.colors.border.focus,
      },
    },
  },

  variants: {
    size: {
      sm: { height: "36px", padding: `0 ${vars.space.xs}` },
      md: { height: "48px", padding: `0 ${vars.space.sm}` },
    },
  },

  defaultVariants: {
    size: "md",
  },
});

export const inputStyles = recipe({
  base: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    padding: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: vars.colors.text.primary,
    fontFamily: vars.fontFamily.base,
    fontWeight: vars.fontWeights.semibold,
    fontVariantNumeric: vars.numeric.tabular,
    textAlign: "center",
    // 스핀 화살표는 우리 버튼과 중복이라 숨긴다.
    MozAppearance: "textfield",
    "::-webkit-outer-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
    },
    "::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
    },

    selectors: {
      "&:disabled": {
        cursor: "not-allowed",
      },
    },
  },

  variants: {
    size: {
      sm: {
        fontSize: vars.typography.t6.fontSize,
        lineHeight: vars.typography.t6.lineHeight,
      },
      md: {
        fontSize: vars.typography.t5.fontSize,
        lineHeight: vars.typography.t5.lineHeight,
      },
    },
  },

  defaultVariants: {
    size: "md",
  },
});

export const unitStyles = style({
  flexShrink: 0,
  paddingRight: vars.space.xs,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
});

export const helperStyles = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  fontVariantNumeric: vars.numeric.tabular,
});
