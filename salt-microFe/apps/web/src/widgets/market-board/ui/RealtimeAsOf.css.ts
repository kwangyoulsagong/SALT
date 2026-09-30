import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

const breathe = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.35 },
});

/**
 * 연결 중인 점이 숨 쉰다 (FE-REQ-044 P-38) — "지금 받고 있다"는 진행 표시라 반복이 정당하다.
 * 줄인 모션이면 멈추지 않고 느려진다(`performance-frontend.md` §8).
 */
export const liveDot = style({
  display: "inline-block",
  animation: `${breathe} calc(${vars.motion.duration.scene} * 2) ${vars.motion.easing.move} infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animationDuration: `calc(${vars.motion.duration.scene} * 5)`,
    },
  },
});
