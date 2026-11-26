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

/**
 * 막대 차오름 (FE-REQ-062 FR-6) — 진척 · 봉투 · 비율 · 날마다 막대가 처음 그려질 때 0 에서 값까지 한 번.
 *
 * 크기(`width` · `height`)는 값 그대로 두고 **`transform` 만** 움직인다 — 키프레임에 `from` 만 두면 끝은 요소 자신의
 * 변형(없으면 그대로)이다. 서버 HTML 도 끝 상태로 선다(CSS 애니메이션). 줄인 모션이면 끈다.
 * 가로 막대는 `growInX`(왼쪽에서), 세로 막대는 `growInY`(바닥에서) 를 그 막대 스타일에 펼친다.
 */
const fromLeft = keyframes({ from: { transform: "scaleX(0)" } });
const fromBottom = keyframes({ from: { transform: "scaleY(0)" } });

const grow = (name: string, origin: string) => ({
  transformOrigin: origin,
  animation: `${name} ${vars.motion.duration.slow} ${vars.motion.easing.enter} both`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const growInX = grow(fromLeft, "left center");
export const growInY = grow(fromBottom, "center bottom");

/**
 * 목록 행 차례 등장 (FE-REQ-062 FR-3) — 투명도 + 크기 .96 → 1, `duration.base`, 행마다 `staggerRow`(20ms).
 * 8행 넘으면 나머지는 같이. 블록(`enterReveal` — 8px 떠오름 · `slow`)보다 짧고 작다 — 행은 배경이다.
 */
const rowIn = keyframes({
  from: { opacity: 0, transform: "scale(0.96)" },
  to: { opacity: 1, transform: "none" },
});

const { staggerRow } = tokens.motion;

/** 행 등장 애니메이션 값 — `enterRow`(스타일에 펼침)와 전역 목록 규칙(`@repo/web-shared/layout/globals.css`)이 같이 쓴다 */
export const ENTER_ROW_ANIMATION = `${rowIn} ${vars.motion.duration.base} ${vars.motion.easing.enter} both`;

/** n 번째(1부터) 행의 지연 — 8행까지 차례, 그 뒤는 같이 */
export const enterRowDelay = (nth: number) => `${Math.round((Math.min(nth, staggerLimit + 1) - 1) * staggerRow * 1000)}ms`;

export const enterRow = {
  animation: ENTER_ROW_ANIMATION,
  selectors: Object.fromEntries([
    ...Array.from({ length: staggerLimit - 1 }, (_, index) => [`&:nth-child(${index + 2})`, { animationDelay: enterRowDelay(index + 2) }]),
    [`&:nth-child(n + ${staggerLimit + 1})`, { animationDelay: enterRowDelay(staggerLimit + 1) }],
  ]),
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
};

/**
 * 차트 선 그리기 (FE-REQ-062 FR-7) — SVG 차트가 처음 그려질 때 왼쪽에서 오른쪽으로 한 번 드러난다.
 *
 * 바깥 `<svg>` 의 `clip-path: inset()` 을 넓힌다. 처음엔 `clipPath` 안 사각형을 `scaleX` 로 넓혔는데 SVG 안 변형이라 **매 프레임
 * 레이아웃**이 났다(투자 표 호버 12행 — 레이아웃 70 → 248, 2026-11-26 트레이스). 바깥 요소 자르기는 레이아웃 0(→ 78) · 칠하기 시간도 늘지 않았다.
 * 선 굵기 · 둥근 끝이 상자 밖으로 나가므로 넉넉히 자르고, 끝나면 자르기가 없어진다(`backwards`). 한 장면 `duration.scene` · 곡선 `standard`.
 * 실시간 갱신은 같은 요소라 다시 돌지 않는다. 서버 HTML 은 끝 상태로 선다.
 */
const reveal = keyframes({
  from: { clipPath: "inset(-8px 100% -8px -8px)" },
  to: { clipPath: "inset(-8px -8px -8px -8px)" },
});

export const chartReveal = {
  animation: `${reveal} ${vars.motion.duration.scene} ${vars.motion.easing.standard} backwards`,
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
} as const;
