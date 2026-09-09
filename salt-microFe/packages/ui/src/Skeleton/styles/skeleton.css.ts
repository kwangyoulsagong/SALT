import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

/** opacity만 바꾼다. 배경 gradient 이동은 paint 비용이 크다. */
const pulse = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.45 },
});

export const skeletonStyles = recipe({
  base: {
    display: "block",
    background: vars.colors.neutral[100],
    animation: `${pulse} 1.4s ease-in-out infinite`,

    "@media": {
      "(prefers-reduced-motion: reduce)": {
        animation: "none",
      },
    },
  },

  variants: {
    radius: {
      none: { borderRadius: vars.radius.none },
      small: { borderRadius: vars.radius.small },
      base: { borderRadius: vars.radius.base },
      medium: { borderRadius: vars.radius.medium },
      full: { borderRadius: vars.radius.full },
    },
  },

  defaultVariants: {
    radius: "small",
  },
});

export const linesStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  width: "100%",
});
