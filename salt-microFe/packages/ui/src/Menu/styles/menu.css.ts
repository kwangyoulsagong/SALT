import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  position: "relative",
  display: "inline-flex",
});

export const listStyles = recipe({
  base: {
    position: "absolute",
    top: "calc(100% + 4px)",
    zIndex: vars.zIndices.dropdown,
    minWidth: "180px",
    margin: 0,
    padding: vars.space.xs,
    listStyle: "none",
    borderRadius: vars.radius.medium,
    background: vars.colors.background.white,
    boxShadow: vars.elevation.md,
    fontFamily: vars.fontFamily.base,
  },

  variants: {
    align: {
      start: { left: 0 },
      end: { right: 0 },
    },
  },

  defaultVariants: {
    align: "end",
  },
});

export const itemStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.sm,
    width: "100%",
    minHeight: "40px",
    padding: `0 ${vars.space.md}`,
    border: "none",
    borderRadius: vars.radius.base,
    background: "transparent",
    color: vars.colors.text.primary,
    fontFamily: vars.fontFamily.base,
    fontSize: vars.typography.t6.fontSize,
    lineHeight: vars.typography.t6.lineHeight,
    textAlign: "left",
    cursor: "pointer",

    selectors: {
      "&:hover:not(:disabled)": {
        background: vars.colors.neutral[50],
      },
      "&:disabled": {
        color: vars.colors.text.disabled,
        cursor: "not-allowed",
      },
    },
  },

  variants: {
    tone: {
      default: {},
      danger: { color: vars.colors.status.errorDark },
    },
  },

  defaultVariants: {
    tone: "default",
  },
});
