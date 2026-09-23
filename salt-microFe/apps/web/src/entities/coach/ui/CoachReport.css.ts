import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 추천 머리 — 행동 배지 · 종목 · 점수가 한 줄. 좁으면 줄바꿈 */
export const recommendationHead = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.sm,
});

export const recommendationSymbol = style({
  margin: 0,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});

/**
 * 점수는 **숫자만** 쓴다(FR-14). 게이지 · 막대로 채우면 확률로 읽힌다. 바로 옆에
 * `scoreNote` 를 같은 줄에 둔다 — 떨어뜨리면 숫자만 기억된다.
 */
export const scoreRow = style({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: vars.space.sm,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
  fontVariantNumeric: vars.numeric.tabular,
});

export const scoreNoteText = style({
  fontSize: vars.typography.t8.fontSize,
  fontWeight: vars.fontWeights.regular,
  color: vars.colors.text.tertiary,
});

/** 접힌 근거(FR-7 · FR-103). 실패사례에는 쓰지 않는다(FR-33) */
export const factorDetails = style({
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.secondary,
});

export const factorSummary = style({
  cursor: "pointer",
  color: vars.colors.text.tertiary,
});

export const factorRow = style({
  display: "flex",
  justifyContent: "space-between",
  gap: vars.space.sm,
  fontVariantNumeric: vars.numeric.tabular,
});

/** 실패사례 한 건 — 날짜 줄 아래 사건 · 결과 문장. 문장이 길어 한 줄로 벌리지 않는다 */
export const failureItem = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  padding: `${vars.space.sm} 0`,
  borderBottom: `1px solid ${vars.colors.neutral[100]}`,
});

export const failureDate = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
});

/** 규칙 기반 · AI 배지 줄 + 해설 */
export const explanation = style({
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.secondary,
});

export const factList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.secondary,
});

export const factItem = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  padding: `${vars.space.sm} 0`,
  borderBottom: `1px solid ${vars.colors.neutral[100]}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

export const factMeta = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
});

export const exitPlanBlock = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
});

export const exitPlanHead = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: vars.space.sm,
  flexWrap: "wrap",
});
