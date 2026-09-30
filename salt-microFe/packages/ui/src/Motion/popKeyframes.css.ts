import { keyframes, style } from "@vanilla-extract/css";

import { vars } from "../styles/tokens.css";

/** 한 번 튀기 — 별 토글 · 체크 (FE-REQ-044 P-33 · P-34). 바뀐 순간에만 클래스를 붙인다 */
const pop = keyframes({
  "0%": { transform: "scale(0.6)" },
  "60%": { transform: "scale(1.2)" },
  "100%": { transform: "scale(1)" },
});

export const popOnce = style({
  transformBox: "fill-box",
  transformOrigin: "center",
  animation: `${pop} ${vars.motion.duration.slow} ${vars.motion.easing.enter}`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});
