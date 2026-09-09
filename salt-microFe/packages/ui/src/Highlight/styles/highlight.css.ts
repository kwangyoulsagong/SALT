import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const highlightStyles = recipe({
  base: {
    padding: "0 2px",
    borderRadius: vars.radius.xs,
    fontWeight: vars.fontWeights.semibold,
  },

  variants: {
    tone: {
      brand: {
        background: vars.colors.brand.lighter,
        color: vars.colors.brand.active,
      },
      ai: {
        background: vars.colors.ai.lighter,
        color: vars.colors.neutral[800],
      },
      up: {
        background: vars.colors.special.upLight,
        color: vars.colors.special.upDark,
      },
      down: {
        background: vars.colors.special.downLight,
        color: vars.colors.special.downDark,
      },
      neutral: {
        background: vars.colors.neutral[100],
        color: vars.colors.neutral[800],
      },
    },
  },

  defaultVariants: {
    tone: "brand",
  },
});
