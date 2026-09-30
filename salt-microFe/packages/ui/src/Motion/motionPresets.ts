import { tokens } from "@repo/tokens";

const { duration, easing, spring } = tokens.motion;

type Bezier = [number, number, number, number];

/** 토큰을 `motion` transition 모양으로 (FE-REQ-044 FR-1). 컴포넌트에 숫자를 쓰지 않게 여기서 한 번 바꾼다. */
export const ease = {
  enter: easing.enter as Bezier,
  exit: easing.exit as Bezier,
  move: easing.move as Bezier,
  fall: easing.fall as Bezier,
};

export const springs = {
  snappy: { type: "spring" as const, ...spring.snappy },
  bouncy: { type: "spring" as const, ...spring.bouncy },
  gentle: { type: "spring" as const, ...spring.gentle },
};

export const durations = duration;
export const motionTokens = tokens.motion;
