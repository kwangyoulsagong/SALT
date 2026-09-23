import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 코치 리포트. 상세 분석 화면과 **같은 카드 언어**(흰 면 + 옅은 그림자 · 20px 모서리)를 쓴다 —
 * 같은 앱 안에서 카드 모양이 두 벌이면 다른 제품처럼 보인다. 값은 `SymbolAnalysis.css.ts` 와
 * 같게 두고, 세 번째 화면이 생기면 `shared/ui` 로 내린다.
 */
const STACK_BREAKPOINT = "1024px";
const NARROW = "screen and (max-width: 640px)";
const SIDE_WIDTH = "380px";
const CARD_RADIUS = "20px";
const CARD_SHADOW = "0 1px 2px rgba(25,31,40,0.04), 0 10px 24px rgba(25,31,40,0.05)";
const DISCLAIMER_BAR_HEIGHT = "44px";

export const layout = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xl,
  minWidth: 0,
  paddingBottom: DISCLAIMER_BAR_HEIGHT,
});

export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space.lg,
  flexWrap: "wrap",
});

export const titleBlock = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  minWidth: 0,
});

export const title = style({
  margin: 0,
  fontSize: vars.typography.t4.fontSize,
  lineHeight: vars.typography.t4.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});

export const meta = style({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.sm,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

/** FR-143 — 표본이 쌓이는 중. 회색 안내이지 경고가 아니다 */
export const accumulating = style({
  margin: 0,
  padding: vars.space.lg,
  borderRadius: CARD_RADIUS,
  background: vars.colors.background.white,
  boxShadow: CARD_SHADOW,
  color: vars.colors.text.secondary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const grid = style({
  display: "grid",
  gridTemplateColumns: `minmax(0, 1fr) ${SIDE_WIDTH}`,
  gap: vars.space.lg,
  alignItems: "start",
  "@media": {
    [`screen and (max-width: ${STACK_BREAKPOINT})`]: {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const column = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  minWidth: 0,
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  padding: vars.space.xl,
  borderRadius: CARD_RADIUS,
  background: vars.colors.background.white,
  boxShadow: CARD_SHADOW,
  minWidth: 0,
  "@media": {
    [NARROW]: { padding: vars.space.lg },
  },
});

export const cardTitle = style({
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  margin: 0,
});

export const excludedLine = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
});

/** 면책 — 하단 고정. 스크롤 위치와 무관하게 늘 보인다(FR-90) */
export const disclaimerBar = style({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: vars.zIndices.sticky,
  minHeight: DISCLAIMER_BAR_HEIGHT,
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: vars.colors.background.white,
  borderTop: `1px solid ${vars.colors.border.light}`,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
});

export const disclaimerLabel = style({
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.secondary,
  whiteSpace: "nowrap",
});
