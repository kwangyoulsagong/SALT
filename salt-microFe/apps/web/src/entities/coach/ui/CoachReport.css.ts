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

/* ── 목록 행 — 왼쪽 라벨 · 오른쪽 값 · 값 아래 보조줄 ───────────────── */

/** 행 사이는 옅은 1px 선. 첫 행 위에는 선이 없다 */
export const rowList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
});

export const row = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space.lg,
  padding: "14px 0",
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  selectors: { "&:first-child": { borderTop: "none", paddingTop: 0 } },
});

export const rowLabel = style({
  margin: 0,
  flexShrink: 0,
  color: vars.colors.neutral[600],
  fontSize: "15px",
  lineHeight: "22px",
});

export const rowValue = style({
  margin: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "2px",
  minWidth: 0,
  textAlign: "right",
});

/** 값 — 라벨보다 한 단계 크고 굵다. 폭이 흔들리지 않게 자리폭 고정 */
export const rowAmount = style({
  color: vars.colors.text.primary,
  fontSize: "16px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
});

/** 값이 숫자가 아니라 문장일 때(추세 유지 조건) — 굵게 쓰지 않는다 */
export const rowSentence = style({
  color: vars.colors.neutral[700],
  fontSize: "14px",
  lineHeight: "21px",
  maxWidth: "320px",
});

export const rowCaption = style({
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "19px",
  fontVariantNumeric: vars.numeric.tabular,
});

/** 문장 목록(주의할 점 · 거래 기록) — 한 행에 사실 하나 */
export const factList = style([rowList]);

export const factItem = style({
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "14px 0",
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  color: vars.colors.text.primary,
  fontSize: "15px",
  lineHeight: "22px",
  selectors: { "&:first-child": { borderTop: "none", paddingTop: 0 } },
});

export const factBody = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

/** 주의할 점 앞 작은 점 — 상자를 노랗게 칠하지 않고 점만 */
export const cautionDot = style({
  flexShrink: 0,
  width: "6px",
  height: "6px",
  marginTop: "8px",
  borderRadius: "50%",
  background: vars.colors.status.warning,
});

export const factMeta = style([rowCaption]);

/* ── 익절 플랜 — 보유 종목 하나씩 ───────────────────────────── */

export const holdingList = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xl,
});

export const holdingHead = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: vars.space.sm,
  marginBottom: vars.space.md,
});

export const holdingSymbol = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "17px",
  lineHeight: "25px",
  fontWeight: vars.fontWeights.bold,
});
