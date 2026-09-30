import { tokens } from "@repo/tokens";

import { vars } from "./tokens.css";

/**
 * 누름 피드백 (FE-REQ-044 FR-30) — 누르는 동안 0.97 로 줄었다가 떼면 돌아온다.
 *
 * `transform` 이 아니라 **독립 속성 `scale`** 을 쓴다. 토글 손잡이(`translateX`) · 버튼(`translateY`)처럼
 * 이미 `transform` 을 쓰는 컴포넌트와 겹치지 않는다. 각 컴포넌트의 `transition` 에 `PRESS_TRANSITION` 을 이어 붙이고,
 * `selectors` 에 `PRESS_SELECTOR` 를, 최상위에 `pressReducedMotion` 을 펼친다.
 */
export const PRESS_TRANSITION = `scale ${vars.motion.duration.instant} ${vars.motion.easing.enter}`;

export const PRESS_SELECTOR = "&:active:not(:disabled):not([aria-disabled='true'])";

export const pressActive = { scale: String(tokens.motion.pressScale) };

export const pressReducedMotion = {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      selectors: { [PRESS_SELECTOR]: { scale: "none" } },
    },
  },
};
