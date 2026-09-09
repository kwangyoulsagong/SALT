import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const assetIconStyles = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: vars.radius.full,
    background: vars.colors.neutral[100],
    color: vars.colors.text.white,
    fontFamily: vars.fontFamily.base,
    fontWeight: vars.fontWeights.bold,
    letterSpacing: vars.letterSpacings.tight,
    userSelect: "none",
  },

  variants: {
    size: {
      sm: { width: "24px", height: "24px", fontSize: "10px" },
      md: { width: "32px", height: "32px", fontSize: "13px" },
      lg: { width: "40px", height: "40px", fontSize: "15px" },
      xl: { width: "48px", height: "48px", fontSize: "17px" },
    },
  },

  defaultVariants: {
    size: "md",
  },
});

export const imageStyles = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});
