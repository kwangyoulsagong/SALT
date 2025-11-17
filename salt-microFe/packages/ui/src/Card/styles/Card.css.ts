import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css.ts";

export const cardStyles = recipe({
  base: {
    width: "100%",
    borderRadius: vars.radius.xl,
    background: vars.colors.background.white,
    boxShadow: `0 1px 3px ${vars.colors.shadow.sm}`,
  },

  variants: {
    padding: {
      none: {
        padding: vars.space.none,
      },
      sm: {
        padding: vars.space.md,
      },
      md: {
        padding: vars.space.lg,
      },
      lg: {
        padding: vars.space.xl,
      },
      xl: {
        padding: vars.space["2xl"],
      },
    },
  },

  defaultVariants: {
    padding: "md",
  },
});
