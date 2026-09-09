import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const iconButtonStyles = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
    border: "none",
    borderRadius: vars.radius.button.md,
    cursor: "pointer",
    transition: vars.transitions.fast,

    selectors: {
      "&:disabled": {
        opacity: 0.4,
        cursor: "not-allowed",
      },
    },
  },

  variants: {
    variant: {
      ghost: {
        background: "transparent",
        color: vars.colors.text.primary,

        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.neutral[50],
          },
          "&:active:not(:disabled)": {
            background: vars.colors.neutral[100],
          },
        },
      },
      tonal: {
        background: vars.colors.neutral[100],
        color: vars.colors.neutral[700],

        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.neutral[200],
          },
        },
      },
      solid: {
        background: vars.colors.brand.primary,
        color: vars.colors.text.white,

        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.brand.hover,
          },
        },
      },
    },

    size: {
      sm: { width: "32px", height: "32px" },
      md: { width: "40px", height: "40px" },
      lg: { width: "48px", height: "48px" },
    },

    round: {
      true: { borderRadius: vars.radius.full },
      false: {},
    },
  },

  defaultVariants: {
    variant: "ghost",
    size: "md",
    round: false,
  },
});
