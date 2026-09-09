import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const listStyles = style({
  display: "flex",
  alignItems: "flex-start",
  width: "100%",
  margin: 0,
  padding: 0,
  listStyle: "none",
  fontFamily: vars.fontFamily.base,
});

export const stepStyles = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space.xs,
  flex: 1,
  minWidth: 0,
  position: "relative",
});

export const markerRowStyles = style({
  display: "flex",
  alignItems: "center",
  width: "100%",
});

export const connectorStyles = recipe({
  base: {
    flex: 1,
    height: "2px",
  },

  variants: {
    filled: {
      true: { background: vars.colors.brand.primary },
      false: { background: vars.colors.neutral[200] },
    },
    hidden: {
      true: { visibility: "hidden" },
      false: {},
    },
  },

  defaultVariants: {
    filled: false,
    hidden: false,
  },
});

export const markerStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "24px",
    height: "24px",
    borderRadius: vars.radius.full,
    fontSize: vars.typography.t8.fontSize,
    fontWeight: vars.fontWeights.bold,
    fontVariantNumeric: vars.numeric.tabular,
  },

  variants: {
    state: {
      done: {
        background: vars.colors.brand.primary,
        color: vars.colors.text.white,
      },
      current: {
        background: vars.colors.brand.lighter,
        color: vars.colors.brand.active,
        boxShadow: `0 0 0 2px ${vars.colors.brand.primary}`,
      },
      upcoming: {
        background: vars.colors.neutral[100],
        color: vars.colors.text.tertiary,
      },
    },
  },

  defaultVariants: {
    state: "upcoming",
  },
});

export const labelStyles = recipe({
  base: {
    maxWidth: "100%",
    textAlign: "center",
    fontSize: vars.typography.t8.fontSize,
    lineHeight: vars.typography.t8.lineHeight,
    wordBreak: "keep-all",
  },

  variants: {
    state: {
      done: { color: vars.colors.text.tertiary },
      current: {
        color: vars.colors.text.primary,
        fontWeight: vars.fontWeights.bold,
      },
      upcoming: { color: vars.colors.text.tertiary },
    },
  },

  defaultVariants: {
    state: "upcoming",
  },
});
