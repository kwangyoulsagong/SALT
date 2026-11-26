import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { growInX } from "../../Motion/enterReveal.css";
import { vars } from "../../styles/tokens.css";

export const trackStyles = style({
  position: "relative",
  display: "flex",
  width: "100%",
  overflow: "hidden",
  borderRadius: vars.radius.full,
  background: vars.colors.neutral[100],
});

export const fillStyles = recipe({
  /**
   * 채움은 늘 트랙 폭 그대로이고 값은 `scaleX` 다(FE-REQ-062 FR-6 — 옛 `width` 전환은 매 프레임 레이아웃).
   * 처음 그릴 때 0 → 값 한 번(`growInX`), 값이 바뀌면 `duration.base` 로 옮겨 간다.
   */
  base: {
    position: "absolute",
    inset: 0,
    ...growInX,
    transition: `transform ${vars.motion.duration.base} ${vars.motion.easing.enter}`,
    "@media": {
      "(prefers-reduced-motion: reduce)": { animation: "none", transition: "none" },
    },
  },

  variants: {
    tone: {
      brand: { background: vars.colors.brand.primary },
      up: { background: vars.colors.special.up },
      down: { background: vars.colors.special.down },
      success: { background: vars.colors.status.success },
      warning: { background: vars.colors.status.warning },
      neutral: { background: vars.colors.neutral[400] },
      ai: { background: vars.colors.ai.primary },
    },
  },

  defaultVariants: {
    tone: "brand",
  },
});
