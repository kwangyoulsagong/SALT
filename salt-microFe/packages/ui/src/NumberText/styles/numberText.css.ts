import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const numberTextStyles = recipe({
  base: {
    fontFamily: vars.fontFamily.base,
    fontVariantNumeric: vars.numeric.tabular,
    fontFeatureSettings: '"tnum"',
    whiteSpace: "nowrap",
  },

  variants: {
    size: {
      t1: {
        fontSize: vars.typography.t1.fontSize,
        lineHeight: vars.typography.t1.lineHeight,
        letterSpacing: vars.letterSpacings.tightest,
      },
      t2: {
        fontSize: vars.typography.t2.fontSize,
        lineHeight: vars.typography.t2.lineHeight,
        letterSpacing: vars.letterSpacings.tightest,
      },
      t3: {
        fontSize: vars.typography.t3.fontSize,
        lineHeight: vars.typography.t3.lineHeight,
        letterSpacing: vars.letterSpacings.tight,
      },
      t4: {
        fontSize: vars.typography.t4.fontSize,
        lineHeight: vars.typography.t4.lineHeight,
        letterSpacing: vars.letterSpacings.tight,
      },
      t5: {
        fontSize: vars.typography.t5.fontSize,
        lineHeight: vars.typography.t5.lineHeight,
      },
      t6: {
        fontSize: vars.typography.t6.fontSize,
        lineHeight: vars.typography.t6.lineHeight,
      },
      t7: {
        fontSize: vars.typography.t7.fontSize,
        lineHeight: vars.typography.t7.lineHeight,
      },
      t8: {
        fontSize: vars.typography.t8.fontSize,
        lineHeight: vars.typography.t8.lineHeight,
      },
    },

    tone: {
      up: { color: vars.colors.special.up },
      down: { color: vars.colors.special.down },
      neutral: { color: vars.colors.text.primary },
      muted: { color: vars.colors.text.tertiary },
    },

    weight: {
      regular: { fontWeight: vars.fontWeights.regular },
      medium: { fontWeight: vars.fontWeights.medium },
      semibold: { fontWeight: vars.fontWeights.semibold },
      bold: { fontWeight: vars.fontWeights.bold },
    },
  },

  defaultVariants: {
    size: "t6",
    tone: "neutral",
    weight: "semibold",
  },
});

export const unitStyles = style({
  marginLeft: "2px",
  fontSize: "0.8em",
  fontWeight: vars.fontWeights.medium,
});
