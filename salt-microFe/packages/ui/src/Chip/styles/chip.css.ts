import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";
import { PRESS_SELECTOR, PRESS_TRANSITION, pressActive, pressReducedMotion } from "../../styles/press";

export const chipStyles = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: vars.space.xs,
    flexShrink: 0,
    border: `1px solid ${vars.colors.border.light}`,
    borderRadius: vars.radius.full,
    background: vars.colors.background.white,
    color: vars.colors.neutral[700],
    fontFamily: vars.fontFamily.base,
    fontWeight: vars.fontWeights.medium,
    cursor: "pointer",
    transition: `${vars.transitions.fast}, ${PRESS_TRANSITION}`,
    whiteSpace: "nowrap",
    ...pressReducedMotion,

    selectors: {
      [PRESS_SELECTOR]: pressActive,
      "&:hover:not(:disabled)": {
        background: vars.colors.neutral[50],
      },
      "&:disabled": {
        opacity: 0.4,
        cursor: "not-allowed",
      },
    },
  },

  variants: {
    selected: {
      true: {
        borderColor: vars.colors.brand.primary,
        background: vars.colors.brand.lighter,
        color: vars.colors.brand.active,
        fontWeight: vars.fontWeights.semibold,

        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.brand.lighter,
          },
        },
      },
      false: {},
    },

    size: {
      sm: {
        height: "28px",
        padding: `0 ${vars.space.md}`,
        fontSize: vars.typography.t7.fontSize,
        lineHeight: vars.typography.t7.lineHeight,
      },
      md: {
        height: "36px",
        padding: `0 ${vars.space.lg}`,
        fontSize: vars.typography.t6.fontSize,
        lineHeight: vars.typography.t6.lineHeight,
      },
    },
  },

  defaultVariants: {
    selected: false,
    size: "md",
  },
});
