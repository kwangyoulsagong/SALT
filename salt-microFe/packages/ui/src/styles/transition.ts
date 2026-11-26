import { vars } from "./tokens.css";

/**
 * 상태 전환 한 벌 (FE-REQ-062 FR-1) — 호버 · 포커스 · 선택 때 바뀌는 **속성만** 적는다.
 *
 * 옛 `vars.transitions.fast`("0.1s ease")는 속성이 없어 브라우저가 `transition: all` 로 읽었다 — 크기 · 그림자까지 따라가
 * 투자 표 행 버튼 101개가 그 값이었다(2026-11-26 실측). 면(배경 · 테두리)은 `duration.hover`, 글자색은 `instant`.
 * 누름까지 있는 컴포넌트는 `${HOVER_TRANSITION}, ${PRESS_TRANSITION}`(`./press`).
 * `transition` 에 길이만 쓰거나 `all` 을 쓰면 `motionBudget.test.ts` 가 막는다.
 */
const surface = `${vars.motion.duration.hover} ${vars.motion.easing.standard}`;

export const HOVER_TRANSITION = [
  `background-color ${surface}`,
  `border-color ${surface}`,
  `color ${vars.motion.duration.instant} ${vars.motion.easing.standard}`,
].join(", ");

/** 투명도만 바뀌는 자리(아이콘 · 겹침 면) */
export const FADE_TRANSITION = `opacity ${surface}`;
