import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const sparklineStyles = recipe({
  base: {
    display: "block",
    overflow: "visible",
  },

  variants: {
    tone: {
      up: { color: vars.colors.special.up },
      down: { color: vars.colors.special.down },
      neutral: { color: vars.colors.neutral[400] },
      brand: { color: vars.colors.brand.primary },
    },
  },

  defaultVariants: {
    tone: "neutral",
  },
});
