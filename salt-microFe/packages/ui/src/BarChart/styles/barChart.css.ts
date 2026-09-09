import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  width: "100%",
  fontFamily: vars.fontFamily.base,
});

export const plotStyles = style({
  display: "flex",
  alignItems: "flex-end",
  gap: vars.space.sm,
  width: "100%",
});

export const columnStyles = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space.xs,
  flex: 1,
  minWidth: 0,
  height: "100%",
  justifyContent: "flex-end",
});

export const barStyles = recipe({
  base: {
    width: "100%",
    maxWidth: "48px",
    minHeight: "2px",
    borderTopLeftRadius: vars.radius.small,
    borderTopRightRadius: vars.radius.small,
    transition: `height ${vars.transitions.base}`,
  },

  variants: {
    tone: {
      brand: { background: vars.colors.brand.primary },
      up: { background: vars.colors.special.up },
      down: { background: vars.colors.special.down },
      neutral: { background: vars.colors.neutral[300] },
      ai: { background: vars.colors.ai.primary },
    },
  },

  defaultVariants: {
    tone: "brand",
  },
});

export const labelStyles = style({
  maxWidth: "100%",
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const valueStyles = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
});

/** 차트를 못 읽는 환경에는 같은 데이터를 표로 준다. */
export const srOnlyStyles = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  border: 0,
  clipPath: "inset(50%)",
  overflow: "hidden",
  whiteSpace: "nowrap",
});
