import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const rowStyles = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: vars.space.xs,
    width: "100%",
    padding: `${vars.space.lg} ${vars.space.lg2}`,
    border: "none",
    background: vars.colors.background.white,
    fontFamily: vars.fontFamily.base,
    textAlign: "left",
  },

  variants: {
    pressable: {
      true: {
        cursor: "pointer",

        selectors: {
          "&:hover": { background: vars.colors.neutral[50] },
        },
      },
      false: {},
    },

    divider: {
      true: {
        boxShadow: `inset 0 -1px 0 ${vars.colors.border.light}`,
      },
      false: {},
    },
  },

  defaultVariants: {
    pressable: false,
    divider: true,
  },
});

export const headStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
});

export const titleStyles = style({
  flex: 1,
  minWidth: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const excerptStyles = style({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  color: vars.colors.neutral[600],
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  wordBreak: "keep-all",
});

export const metaStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  fontVariantNumeric: vars.numeric.tabular,
});

export const metaItemStyles = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
});
