import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css.ts";

export const sectionStyles = recipe({
  base: {
    width: "100%",
  },

  variants: {
    // 패딩 (상하)
    padding: {
      none: {
        paddingTop: vars.space.none,
        paddingBottom: vars.space.none,
      },
      xs: {
        paddingTop: vars.space["xl"],
        paddingBottom: vars.space["xl"],
      },
      sm: {
        paddingTop: vars.space["2xl"],
        paddingBottom: vars.space["2xl"],
      },
      md: {
        paddingTop: vars.space["3xl"],
        paddingBottom: vars.space["3xl"],
      },
      lg: {
        paddingTop: vars.space["4xl"],
        paddingBottom: vars.space["4xl"],
      },
      xl: {
        paddingTop: vars.space["5xl"],
        paddingBottom: vars.space["5xl"],
      },
    },

    // 배경색
    background: {
      transparent: {
        background: "transparent",
      },
      white: {
        background: vars.colors.background.white,
      },
      gray: {
        background: vars.colors.background.primary,
      },
      brand: {
        background: vars.colors.brand.primary,
        color: vars.colors.text.white,
      },
      dark: {
        background: vars.colors.background.dark,
        color: vars.colors.text.white,
      },
      gradient: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: vars.colors.text.white,
      },
    },

    // 전체 너비
    fullWidth: {
      true: {
        maxWidth: "100%",
      },
      false: {},
    },
  },

  defaultVariants: {
    padding: "md",
    background: "transparent",
    fullWidth: false,
  },
});
