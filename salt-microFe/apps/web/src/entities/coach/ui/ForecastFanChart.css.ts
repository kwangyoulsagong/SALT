import { keyframes, style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 움직임은 `transform` · `opacity` · `stroke-dashoffset` 만 쓴다(`performance.md` 애니메이션).
 * 줄인 모션에서는 전부 멈춘 최종 상태로 그린다.
 */
const still = { "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } } } as const;

const draw = keyframes({ from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } });
const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const unfold = keyframes({ from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } });
const rise = keyframes({ from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } });
const pop = keyframes({ from: { transform: "scale(0)" }, to: { transform: "scale(1)" } });
const breathe = keyframes({
  from: { transform: "scale(1)", opacity: 0.45 },
  to: { transform: "scale(3)", opacity: 0 },
});

export const frame = style({ width: "100%", overflow: "hidden" });

export const svg = style({ display: "block", overflow: "visible" });

/** 선 색은 기간 전체의 등락 — 국내 관례(상승 빨강 · 하락 파랑). 영역 그라데이션이 `currentColor` 를 따른다 */
export const tone = styleVariants({
  up: { color: vars.colors.special.up },
  down: { color: vars.colors.special.down },
  flat: { color: vars.colors.text.primary },
});

export const line = style({
  ...still,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinejoin: "round",
  strokeLinecap: "round",
  strokeDasharray: 1,
  animation: `${draw} 900ms cubic-bezier(0.4, 0, 0.2, 1) both`,
});

export const area = style({ ...still, animation: `${fade} 500ms ease 500ms both` });

/** 범위는 "지금"(자기 상자의 왼쪽 끝)에서 오른쪽으로 펼쳐진다 */
export const fan = style({
  ...still,
  transformBox: "fill-box",
  transformOrigin: "left center",
  animation: `${unfold} 700ms cubic-bezier(0.2, 0.8, 0.2, 1) 800ms both`,
});

export const fan90 = style({ fill: vars.colors.text.tertiary, fillOpacity: 0.14 });
export const fan50 = style({ fill: vars.colors.text.tertiary, fillOpacity: 0.26 });
export const median = style({
  fill: "none",
  stroke: vars.colors.text.secondary,
  strokeWidth: 1.5,
  strokeDasharray: "4 4",
});

export const nowRule = style({ stroke: vars.colors.border.default, strokeWidth: 1 });
export const weekRule = style({ stroke: vars.colors.border.light, strokeWidth: 1, strokeDasharray: "2 3" });

export const axisLabel = style({
  fill: vars.colors.text.tertiary,
  fontSize: "11px",
  fontWeight: vars.fontWeights.medium,
});

/**
 * 첫 하이라이트가 기다릴 시간 — 컴포넌트가 남은 시간을 인라인으로 넣고 안쪽 움직임이 모두 이만큼 밀린다.
 * 이름을 고정한 사용자 속성이다(인라인에서 쓰려면 이름이 필요하다 — `createVar` 는 `var(...)` 를 준다).
 */
export const INTRO_PROPERTY = "--forecast-intro";
const intro = `var(${INTRO_PROPERTY}, 0ms)`;
const after = (ms: number) => `calc(${intro} + ${ms}ms)`;

export const highlight = style({ ...still, animation: `${fade} 200ms ease both`, animationDelay: intro });

/** 하이라이트 열 — 기간이 바뀔 때마다 아래에서 올라온다 */
export const column = style({
  ...still,
  fill: vars.colors.text.primary,
  fillOpacity: 0.04,
  transformBox: "fill-box",
  transformOrigin: "center bottom",
  animation: `${rise} 320ms ease both`,
  animationDelay: after(0),
});

export const guide = style({ stroke: vars.colors.text.primary, strokeWidth: 1.5, strokeLinecap: "round" });

const dot = {
  ...still,
  transformBox: "fill-box",
  transformOrigin: "center",
  animation: `${pop} 260ms cubic-bezier(0.3, 1.4, 0.5, 1) both`,
} as const;

export const dotEdge = style({
  ...dot,
  fill: vars.colors.background.white,
  stroke: vars.colors.text.primary,
  strokeWidth: 1.5,
  animationDelay: after(120),
});
export const dotMedian = style({ ...dot, fill: vars.colors.text.primary, animationDelay: after(200) });

/** 기간 칩 — 하이라이트 열 위에 떠서 "지금 몇 주 뒤를 보는지" 말한다 */
export const chip = style({
  ...still,
  transformBox: "fill-box",
  transformOrigin: "center bottom",
  animation: `${rise} 260ms ease both`,
  animationDelay: after(60),
});

export const chipBox = style({ fill: vars.colors.text.primary });

export const chipText = style({
  fill: vars.colors.background.white,
  fontSize: "11px",
  fontWeight: vars.fontWeights.bold,
});

/** 실시간 점 — 값이 바뀌면 위아래로 미끄러진다(transform 만) */
export const liveMark = style({
  transition: "transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});

export const liveLink = style({ stroke: "currentColor", strokeWidth: 1, strokeDasharray: "2 2", opacity: 0.6 });

export const liveDot = style({ fill: "currentColor", stroke: vars.colors.background.white, strokeWidth: 2 });

/** 실시간 점의 숨 — 장식이라 줄인 모션에서는 멈춘다 */
export const pulse = style({
  ...still,
  fill: "currentColor",
  transformBox: "fill-box",
  transformOrigin: "center",
  animation: `${breathe} 1600ms ease-out infinite`,
});
