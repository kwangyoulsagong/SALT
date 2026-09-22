import { style, styleVariants } from "@vanilla-extract/css";

// 앱 로컬 토큰(`shared/ui/tokens.css`)은 `@repo/ui/tokens` 로 일원화할 부채다 — 새 파일은 처음부터 이쪽
import { vars } from "@repo/ui/tokens";

const LEGEND_SWATCH_WIDTH = "20px";

export const detailSection = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
});

export const plainList = style({
  margin: 0,
  paddingLeft: vars.space.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  color: vars.colors.text.secondary,
  fontSize: vars.fontSizes.base,
  lineHeight: 1.5,
});

export const statRow = style({
  margin: 0,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: vars.space.md,
});

export const statTerm = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.fontSizes.sm,
});

/** `lowSample` 이면 회색 (FR-21) — 표본이 적은 숫자를 같은 무게로 읽지 않게 */
export const statValue = styleVariants({
  normal: {
    margin: 0,
    color: vars.colors.text.secondary,
    fontSize: vars.fontSizes.base,
    fontWeight: vars.fontWeights.semibold,
  },
  lowSample: {
    margin: 0,
    color: vars.colors.text.disabled,
    fontSize: vars.fontSizes.base,
    fontWeight: vars.fontWeights.semibold,
  },
});

/** 맞았던 때 · 틀렸던 때는 **같은 크기 · 같은 위계**다(B2) — 색으로 가르지 않는다 */
export const caseList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  fontSize: vars.fontSizes.base,
  color: vars.colors.text.secondary,
});

export const caseRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: vars.space.sm,
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: vars.fontSizes.base,
  color: vars.colors.text.secondary,
});

export const tableCaption = style({
  captionSide: "top",
  textAlign: "left",
  paddingBottom: vars.space.sm,
  color: vars.colors.text.tertiary,
  fontSize: vars.fontSizes.sm,
});

export const th = style({
  textAlign: "left",
  fontWeight: vars.fontWeights.regular,
  color: vars.colors.text.tertiary,
  fontSize: vars.fontSizes.sm,
  padding: `${vars.space.xs} 0`,
  borderBottom: `1px solid ${vars.colors.border.light}`,
});

export const td = style({
  padding: `${vars.space.sm} 0`,
  borderBottom: `1px solid ${vars.colors.border.light}`,
  verticalAlign: "top",
});

/** 행 머리(단계 이름) — 굵게 · 가운데 정렬이 브라우저 기본이라 칸과 맞지 않았다 */
export const rowHeader = style([
  td,
  {
    textAlign: "left",
    fontWeight: vars.fontWeights.regular,
    color: vars.colors.text.tertiary,
    whiteSpace: "nowrap",
    paddingRight: vars.space.md,
  },
]);

export const gapCaption = style({
  display: "block",
  color: vars.colors.text.tertiary,
  fontSize: vars.fontSizes.sm,
});

export const legend = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.md,
  fontSize: vars.fontSizes.sm,
  color: vars.colors.text.secondary,
});

export const legendItem = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.xs,
});

const swatchBase = style({
  display: "inline-block",
  width: LEGEND_SWATCH_WIDTH,
  height: 0,
  borderTopWidth: "2px",
});

/** 차트의 선과 같은 색 · 같은 선 모양 (`PreviewChart` `PRICE_LINE_COLOR`) */
export const swatch = styleVariants({
  downSolid: [swatchBase, { borderTopStyle: "solid", borderTopColor: vars.colors.special.down }],
  downDashed: [swatchBase, { borderTopStyle: "dashed", borderTopColor: vars.colors.special.down }],
  neutralSolid: [swatchBase, { borderTopStyle: "solid", borderTopColor: vars.colors.neutral[500] }],
  neutralDashed: [swatchBase, { borderTopStyle: "dashed", borderTopColor: vars.colors.neutral[500] }],
  zoneSolid: [swatchBase, { borderTopStyle: "solid", borderTopColor: vars.colors.ai.primary }],
  zoneDashed: [swatchBase, { borderTopStyle: "dashed", borderTopColor: vars.colors.ai.primary }],
});
