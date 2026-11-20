import { vars } from "@repo/ui/tokens";

/**
 * 휴대폰 누름 반응(사용자 "모바일이니까 마이크로 인터랙션이 더 많아야겠지", `FE-REQ-072` 2026-11-20 · `motion.md`).
 * 누르는 동안 살짝 줄었다가(0.97 · 카드는 0.98) 놓으면 돌아온다 — transform 만 움직인다(`motion.md` §5). 길이 · 곡선은 토큰.
 * 동작 줄이기면 끈다. 스타일 객체에 펼친다: `...press` · `...pressCard`
 */
const reduce = { "(prefers-reduced-motion: reduce)": { transition: "none" } } as const;

export const press = {
  transition: `transform ${vars.motion.duration.instant} ${vars.motion.easing.enter}, background-color ${vars.motion.duration.base} ${vars.motion.easing.enter}`,
  WebkitTapHighlightColor: "transparent",
  "@media": reduce,
} as const;
export const pressed = { transform: "scale(0.97)" } as const;
export const pressedCard = { transform: "scale(0.98)" } as const;
