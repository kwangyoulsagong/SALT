import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../../styles/tokens.css";

export const textVariant = recipe({
  base: {
    margin: 0,
    padding: 0,
    fontFamily: vars.fontFamily.base,
    lineHeight: 1.5,
  },

  variants: {
    // 크기/굵기 스타일
    variant: {
      body: {
        fontSize: vars.fontSizes.sm,
        fontWeight: vars.fontWeights.medium,
      },
      bodyLarge: {
        fontSize: vars.fontSizes.base,
        fontWeight: vars.fontWeights.medium,
      },
      caption: {
        fontSize: vars.fontSizes.xs,
        fontWeight: vars.fontWeights.bold,
      },
    },

    // 색상 (독립적으로 조절 가능)
    color: {
      primary: {
        color: vars.colors.text.primary,
      },
      secondary: {
        color: vars.colors.text.secondary,
      },
      tertiary: {
        color: vars.colors.text.tertiary,
      },
      muted: {
        color: vars.colors.text.disabled,
      },
      brand: {
        color: vars.colors.brand.primary,
      },
      white: {
        color: vars.colors.text.base,
      },
      success: {
        color: vars.colors.status.success,
      },
      up: {
        color: vars.colors.special.up,
      },
      down: {
        color: vars.colors.special.down,
      },
    },
  },

  defaultVariants: {
    variant: "body",
    color: "primary",
  },
});
