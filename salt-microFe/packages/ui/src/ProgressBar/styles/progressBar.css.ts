import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const trackStyles = style({
  display: "flex",
  width: "100%",
  overflow: "hidden",
  borderRadius: vars.radius.full,
  background: vars.colors.neutral[100],
});

export const fillStyles = recipe({
  base: {
    height: "100%",
    transition: `width ${vars.transitions.base}`,
  },

  variants: {
    tone: {
      brand: { background: vars.colors.brand.primary },
      up: { background: vars.colors.special.up },
      down: { background: vars.colors.special.down },
      success: { background: vars.colors.status.success },
      warning: { background: vars.colors.status.warning },
      neutral: { background: vars.colors.neutral[400] },
      ai: { background: vars.colors.ai.primary },
    },
  },

  defaultVariants: {
    tone: "brand",
  },
});
