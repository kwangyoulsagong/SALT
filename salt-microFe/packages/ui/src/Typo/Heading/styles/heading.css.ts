import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../../styles/tokens.css";

export const headingStyles = recipe({
  base: {
    margin: 0,
    padding: 0,
    fontFamily: vars.fontFamily.base,
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
  },

  variants: {
    // 레벨별 기본 스타일
    level: {
      1: {
        fontSize: vars.fontSizes["3xl"],
        fontWeight: vars.fontWeights.bold,
        color: vars.colors.text.primary,
      },
      2: {
        fontSize: vars.fontSizes["2xl"],
        fontWeight: vars.fontWeights.bold,
        color: vars.colors.text.primary,
      },
      3: {
        fontSize: vars.fontSizes.xl,
        fontWeight: vars.fontWeights.semibold,
        color: vars.colors.text.primary,
      },
      4: {
        fontSize: vars.fontSizes.lg,
        fontWeight: vars.fontWeights.semibold,
        color: vars.colors.text.secondary,
      },
      5: {
        fontSize: vars.fontSizes.md,
        fontWeight: vars.fontWeights.medium,
        color: vars.colors.text.secondary,
      },
      6: {
        fontSize: vars.fontSizes.sm,
        fontWeight: vars.fontWeights.medium,
        color: vars.colors.text.tertiary,
      },
    },

    // 크기 오버라이드 (선택사항)
    size: {
      xs: {
        fontSize: vars.fontSizes.xs,
      },
      sm: {
        fontSize: vars.fontSizes.sm,
      },
      md: {
        fontSize: vars.fontSizes.md,
      },
      lg: {
        fontSize: vars.fontSizes.lg,
      },
      xl: {
        fontSize: vars.fontSizes.xl,
      },
      "2xl": {
        fontSize: vars.fontSizes["2xl"],
      },
      "3xl": {
        fontSize: vars.fontSizes["3xl"],
      },
    },

    // 색상 오버라이드
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
      brand: {
        color: vars.colors.brand.primary,
      },
      white: {
        color: vars.colors.text.base,
      },
    },

    lineClamp: {
      1: {
        display: "block",
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      2: {
        display: "-webkit-box",
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 2,
      },
      3: {
        display: "-webkit-box",
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 3,
      },
    },
  },

  defaultVariants: {
    level: 2,
  },
});
