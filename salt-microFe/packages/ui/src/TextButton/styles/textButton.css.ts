import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";
import { PRESS_SELECTOR, PRESS_TRANSITION, pressActive, pressReducedMotion } from "../../styles/press";

export const textButtonStyles = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    padding: 0,
    border: "none",
    background: "none",
    fontFamily: vars.fontFamily.base,
    fontWeight: vars.fontWeights.semibold,
    cursor: "pointer",
    transition: PRESS_TRANSITION,
    ...pressReducedMotion,

    selectors: {
      [PRESS_SELECTOR]: pressActive,
      "&:hover:not(:disabled)": {
        textDecoration: "underline",
        textUnderlineOffset: "2px",
      },
      "&:disabled": {
        opacity: 0.4,
        cursor: "not-allowed",
      },
    },
  },

  variants: {
    tone: {
      brand: { color: vars.colors.brand.primary },
      neutral: { color: vars.colors.neutral[600] },
      danger: { color: vars.colors.status.errorDark },
    },

    size: {
      sm: {
        fontSize: vars.typography.t7.fontSize,
        lineHeight: vars.typography.t7.lineHeight,
      },
      md: {
        fontSize: vars.typography.t6.fontSize,
        lineHeight: vars.typography.t6.lineHeight,
      },
    },
  },

  defaultVariants: {
    tone: "brand",
    size: "md",
  },
});
