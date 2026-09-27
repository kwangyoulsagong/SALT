import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 신호 한 칸(펀딩비 · 김프) — 이름 왼쪽, 값 오른쪽, 아래로 상태 · 보조 줄 */
export const stats = style({ display: "flex", flexDirection: "column" });

export const stat = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  padding: `${vars.space.md} 0`,
  borderTop: `1px solid ${vars.colors.border.light}`,
  selectors: { "&:first-child": { borderTop: 0, paddingTop: 0 } },
});

export const statHead = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const statName = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  fontWeight: vars.fontWeights.semibold,
});

export const statValue = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
});

/** 상태는 판정이 아니다 — 쏠림도 보통도 같은 중립 톤, 쏠림만 글자를 진하게 */
export const state = style({
  alignSelf: "flex-start",
  padding: `2px ${vars.space.sm}`,
  borderRadius: vars.radius.full,
  background: vars.colors.background.tertiary,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
});
export const stateStrong = style([state, { color: vars.colors.text.primary }]);

export const sub = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  fontVariantNumeric: vars.numeric.tabular,
});

export const reading = style([sub, { color: vars.colors.text.secondary }]);

export const reactionName = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.semibold,
});

/** `EventsCard.rowButton` 과 같은 줄 — D-day 칸이 없다 */
export const reactionButton = style({
  width: "100%",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 12px",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `${vars.space.md} 0`,
  border: 0,
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${vars.colors.border.focus}`,
      outlineOffset: "2px",
    },
  },
});
