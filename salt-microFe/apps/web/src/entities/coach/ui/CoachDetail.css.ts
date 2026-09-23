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
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
});

/**
 * 숫자는 **크고 굵게**. 라벨(t8)과 두 단계 차이를 둬야 표가 글 뭉치로 안 보인다.
 * 폭이 흔들리지 않게 `tabular` 로 고정한다 — 갱신될 때마다 칸이 덜컹이지 않는다.
 *
 * `lowSample` 이면 회색이다(FR-21) — 표본이 적은 숫자를 같은 무게로 읽지 않게.
 */
const statValueBase = {
  margin: 0,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
} as const;

export const statValue = styleVariants({
  normal: { ...statValueBase, color: vars.colors.text.primary },
  lowSample: { ...statValueBase, color: vars.colors.text.disabled },
});

/** 맞았던 때 · 틀렸던 때는 **같은 크기 · 같은 위계**다(B2) — 색으로 가르지 않는다 */
export const caseList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.secondary,
});

/**
 * 사례 한 줄. 날짜 · 결과 · 수익률을 **양끝으로 벌리고** 행마다 옅은 선을 둔다 —
 * 나열만 하면 문장처럼 읽히고 어디까지가 한 건인지 흐려진다.
 */
export const caseRow = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: vars.space.sm,
  padding: `${vars.space.sm} 0`,
  borderBottom: `1px solid ${vars.colors.neutral[100]}`,
  fontVariantNumeric: vars.numeric.tabular,
  selectors: {
    "&:last-child": { borderBottom: "none", paddingBottom: 0 },
  },
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
  textAlign: "right",
  fontWeight: vars.fontWeights.regular,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  padding: `0 0 ${vars.space.xs}`,
  selectors: {
    "&:first-child": { textAlign: "left" },
  },
});

/**
 * 값 칸. **오른쪽 정렬 · 굵게 · 자리폭 고정**이다 — 금액은 자릿수를 세로로 맞춰야 읽힌다.
 * 행 구분선은 아주 옅게(선이 진하면 표가 격자가 된다) 두고 마지막 행에는 두지 않는다.
 */
export const td = style({
  padding: `${vars.space.md} 0`,
  borderBottom: `1px solid ${vars.colors.neutral[100]}`,
  verticalAlign: "top",
  textAlign: "right",
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  fontVariantNumeric: vars.numeric.tabular,
  selectors: {
    "tr:last-child &": { borderBottom: "none" },
  },
});

/** 행 머리(단계 이름) — 굵게 · 가운데 정렬이 브라우저 기본이라 칸과 맞지 않았다 */
export const rowHeader = style([
  td,
  {
    textAlign: "left",
    fontSize: vars.typography.t7.fontSize,
    lineHeight: vars.typography.t7.lineHeight,
    fontWeight: vars.fontWeights.regular,
    color: vars.colors.text.secondary,
    whiteSpace: "nowrap",
    paddingRight: vars.space.md,
  },
]);

/** 값 아래 한 줄. 값보다 작고 흐리게 — 같은 무게면 둘 다 안 읽힌다. */
export const gapCaption = style({
  display: "block",
  marginTop: "2px",
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  fontWeight: vars.fontWeights.regular,
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
