import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "../../styles/tokens.css";

const fade = keyframes({
  from: { opacity: 1 },
  to: { opacity: 0 },
});

export const tickFlashWrapper = style({
  position: "relative",
  display: "inline-block",
  isolation: "isolate",
});

export const tickFlashStyles = recipe({
  base: {
    position: "absolute",
    inset: "-2px -6px",
    zIndex: -1,
    borderRadius: vars.radius.small,
    opacity: 0,
    pointerEvents: "none",
    animation: `${fade} ${vars.motion.duration.slow} ${vars.motion.easing.exit}`,
    "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
  },
  variants: {
    direction: {
      up: { background: vars.colors.special.upLight },
      down: { background: vars.colors.special.downLight },
    },
  },
});
