import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 장 상태 줄(FR-41) — 표 머리 한 줄. 좁은 화면에선 줄바꿈한다(숨기지 않는다) */
export const sessionLine = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  columnGap: "6px",
  rowGap: "2px",
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.text.tertiary,
});

export const sessionStrong = style({
  color: vars.colors.text.secondary,
  fontWeight: vars.fontWeights.semibold,
});

export const sessionSep = style({
  color: vars.colors.neutral[300],
});

export const sessionDot = styleVariants({
  live: { color: vars.colors.special.up, fontSize: "10px" },
  idle: { color: vars.colors.neutral[300], fontSize: "10px" },
});

/** 상태 배지가 칸 안에서 줄을 넘치면 다음 줄로 */
export const badges = style({
  display: "inline-flex",
  flexWrap: "wrap",
  gap: "4px",
  alignItems: "center",
});

/** 등락 — 색 + 부호(색만으로 방향을 말하지 않는다) */
export const change = styleVariants({
  up: { color: vars.colors.special.up, fontVariantNumeric: "tabular-nums" },
  down: { color: vars.colors.special.down, fontVariantNumeric: "tabular-nums" },
  flat: { color: vars.colors.text.secondary, fontVariantNumeric: "tabular-nums" },
});

/** 스크린리더만 읽는 글자(상한가 · 하한가 전체 이름) */
export const visuallyHidden = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});
