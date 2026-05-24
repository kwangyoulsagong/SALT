import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css.ts";

export const rootStyles = recipe({
  base: {
    width: "100%",
  },

  variants: {
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
    width: {
      xs: {
        width: "200px",
      },
      sm: {
        width: "300px",
      },
      md: {
        width: "400px",
      },
      lg: {
        width: "500px",
      },
      xl: {
        width: "600px",
      },
      "2xl": {
        width: "800px",
      },
      "3xl": {
        width: "1000px",
      },
      "4xl": {
        width: "1200px",
      },
      full: {
        width: "100%",
      },
    },
    fullHeight: {
      true: {
        height: "100%",
      },
      false: {},
    },
  },
  defaultVariants: {
    background: "transparent",
    fullHeight: false,
  },
});
