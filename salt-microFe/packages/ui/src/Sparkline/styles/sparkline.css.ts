import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const sparklineStyles = recipe({
  base: {
    display: "block",
    overflow: "visible",
  },

  variants: {
    tone: {
      up: { color: vars.colors.special.up },
      down: { color: vars.colors.special.down },
      neutral: { color: vars.colors.neutral[400] },
      brand: { color: vars.colors.brand.primary },
    },
  },

  defaultVariants: {
    tone: "neutral",
  },
});

/** 기준선 — 추세선보다 흐리게, 점선. 선 색과 무관한 중립색이다 */
export const baselineStyle = style({
  stroke: vars.colors.neutral[300],
  strokeWidth: 1,
  strokeDasharray: "3 3",
  vectorEffect: "non-scaling-stroke",
});
