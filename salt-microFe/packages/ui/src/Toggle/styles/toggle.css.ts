import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.md,
  fontFamily: vars.fontFamily.base,
});

export const labelStyles = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
});

export const trackStyles = recipe({
  base: {
    position: "relative",
    flexShrink: 0,
    width: "52px",
    height: "32px",
    padding: 0,
    border: "none",
    borderRadius: vars.radius.full,
    cursor: "pointer",
    transition: `background ${vars.transitions.base}`,

    selectors: {
      "&:disabled": {
        opacity: 0.4,
        cursor: "not-allowed",
      },
    },
  },

  variants: {
    checked: {
      true: { background: vars.colors.brand.primary },
      false: { background: vars.colors.neutral[300] },
    },
  },

  defaultVariants: {
    checked: false,
  },
});

export const thumbStyles = recipe({
  base: {
    position: "absolute",
    top: "2px",
    left: "2px",
    width: "28px",
    height: "28px",
    borderRadius: vars.radius.full,
    background: vars.colors.background.white,
    boxShadow: vars.elevation.sm,
    transition: `transform ${vars.transitions.base}`,

    "@media": {
      "(prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    },
  },

  variants: {
    checked: {
      true: { transform: "translateX(20px)" },
      false: { transform: "translateX(0)" },
    },
  },

  defaultVariants: {
    checked: false,
  },
});
