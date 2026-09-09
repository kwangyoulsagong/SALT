import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  fontFamily: vars.fontFamily.base,
});

export const starButtonStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    border: "none",
    background: "none",
    lineHeight: 0,

    selectors: {
      "&:disabled": {
        cursor: "default",
      },
    },
  },

  variants: {
    interactive: {
      true: { cursor: "pointer" },
      false: { cursor: "default" },
    },

    filled: {
      true: { color: vars.colors.status.warning },
      false: { color: vars.colors.neutral[200] },
    },
  },

  defaultVariants: {
    interactive: false,
    filled: false,
  },
});

export const valueStyles = style({
  marginLeft: vars.space.xs,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
});
