import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const buttonVariants = recipe({
  base: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "none",
    cursor: "pointer",
    fontFamily: vars.fontFamily.base,
    transition: vars.transitions.base,

    selectors: {
      "&:disabled": {
        opacity: 0.5,
        cursor: "not-allowed",
      },
      "&:active:not(:disabled)": {
        transform: "translateY(1px)",
        boxShadow: `inset 0 1px 2px ${vars.colors.shadow.md}`,
      },
    },
  },

  variants: {
    variant: {
      primary: {
        background: vars.colors.brand.primary,
        color: vars.colors.text.white,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.brand.hover,
          },
          "&:active:not(:disabled)": {
            background: vars.colors.brand.active,
          },
        },
      },

      secondary: {
        background: vars.colors.action.primary,
        color: vars.colors.text.white,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.action.hover,
          },
          "&:active:not(:disabled)": {
            background: vars.colors.action.active,
          },
        },
      },

      ghost: {
        background: vars.colors.background.secondary,
        color: vars.colors.text.primary,
        border: `1px solid ${vars.colors.border.default}`,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.background.tertiary,
          },
        },
      },

      outline: {
        background: "transparent",
        color: vars.colors.brand.primary,
        border: `2px solid ${vars.colors.brand.primary}`,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.brand.primary,
            color: vars.colors.text.white,
          },
        },
      },

      warning: {
        background: vars.colors.special.orange,
        color: vars.colors.text.white,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.special.orangeHover,
          },
        },
      },

      danger: {
        background: vars.colors.status.error,
        color: vars.colors.text.white,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.status.errorHover,
          },
        },
      },

      success: {
        background: vars.colors.status.success,
        color: vars.colors.text.white,
        selectors: {
          "&:hover:not(:disabled)": {
            background: vars.colors.status.successHover,
          },
        },
      },
    },

    size: {
      xs: {
        height: "30px",
        fontSize: vars.fontSizes.sm,
        fontWeight: vars.fontWeights.medium,
        borderRadius: vars.radius.base,
        padding: `${vars.space.xs} ${vars.space.sm}`,
      },
      sm: {
        height: "40px",
        fontSize: vars.fontSizes.base,
        fontWeight: vars.fontWeights.semibold,
        borderRadius: vars.radius.medium,
        padding: `${vars.space.sm} ${vars.space.md}`,
      },
      md: {
        height: "48px",
        fontSize: vars.fontSizes.lg,
        fontWeight: vars.fontWeights.semibold,
        borderRadius: vars.radius.medium,
        padding: `${vars.space.sm} ${vars.space.lg}`,
      },
      lg: {
        height: "60px",
        fontSize: vars.fontSizes.xl,
        fontWeight: vars.fontWeights.semibold,
        borderRadius: vars.radius.large,
        padding: `${vars.space.md} ${vars.space.lg}`,
      },
    },

    fullWidth: {
      true: {
        width: "100%",
      },
      false: {},
    },
  },

  defaultVariants: {
    variant: "primary",
    size: "md",
    fullWidth: false,
  },
});
