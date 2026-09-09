import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const sectionBandStyles = recipe({
  base: {
    width: "100%",
    background: vars.colors.neutral[100],
  },

  variants: {
    thickness: {
      thin: { height: "1px" },
      base: { height: vars.space.sm },
      thick: { height: vars.space.md },
    },
  },

  defaultVariants: {
    thickness: "base",
  },
});
