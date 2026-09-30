import { tokens } from "@repo/tokens";
import { keyframes } from "@vanilla-extract/css";

import { vars } from "../styles/tokens.css";

/**
 * 블록 차례 등장 (FE-REQ-044 FR-33 · P-39) — 8px 아래에서 올라오며 나타난다.
 *
 * JS 없이 CSS 로 — 스트리밍으로 늦게 도착한 블록도 DOM 에 들어가는 순간 같은 등장을 한다.
 * 형제끼리는 `stagger` 간격으로 차례로, `staggerLimit`(8) 넘으면 나머지는 한꺼번에.
 * `*.css.ts` 의 base 스타일에 펼친다: `...enterReveal`.
 */
const rise = keyframes({
  from: { opacity: 0, transform: "translateY(8px)" },
  to: { opacity: 1, transform: "none" },
});

const { stagger, staggerLimit } = tokens.motion;

const staggerSelectors = Object.fromEntries(
  Array.from({ length: staggerLimit - 1 }, (_, index) => [
    `&:nth-child(${index + 2})`,
    { animationDelay: `${Math.round((index + 1) * stagger * 1000)}ms` },
  ]),
);

export const enterReveal = {
  animation: `${rise} ${vars.motion.duration.slow} ${vars.motion.easing.enter} both`,
  selectors: {
    ...staggerSelectors,
    [`&:nth-child(n + ${staggerLimit + 1})`]: {
      animationDelay: `${Math.round(staggerLimit * stagger * 1000)}ms`,
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
};
