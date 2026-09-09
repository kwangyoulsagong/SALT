import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const keyValueListStyles = recipe({
  base: {
    display: "grid",
    width: "100%",
    margin: 0,
    columnGap: vars.space.lg,
    fontFamily: vars.fontFamily.base,
  },

  variants: {
    columns: {
      1: { gridTemplateColumns: "1fr" },
      2: {
        gridTemplateColumns: "1fr",
        "@media": {
          "screen and (min-width: 360px)": {
            gridTemplateColumns: "1fr 1fr",
          },
        },
      },
    },
  },

  defaultVariants: {
    columns: 1,
  },
});

export const rowStyles = recipe({
  base: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: vars.space.md,
    minHeight: "40px",
    padding: `${vars.space.sm} 0`,
    borderBottom: `1px solid ${vars.colors.neutral[100]}`,
  },

  variants: {
    last: {
      true: { borderBottom: "none" },
      false: {},
    },
  },

  defaultVariants: {
    last: false,
  },
});

export const labelStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const valueStyles = recipe({
  base: {
    margin: 0,
    textAlign: "right",
    fontSize: vars.typography.t7.fontSize,
    lineHeight: vars.typography.t7.lineHeight,
    fontWeight: vars.fontWeights.semibold,
    fontVariantNumeric: vars.numeric.tabular,
  },

  variants: {
    tone: {
      default: { color: vars.colors.text.primary },
      up: { color: vars.colors.special.up },
      down: { color: vars.colors.special.down },
      muted: { color: vars.colors.text.tertiary },
    },
  },

  defaultVariants: {
    tone: "default",
  },
});
