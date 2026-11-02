import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * F009 슬라이스 5 — 내 거래 미러 · 청산별 태그 · 폼 한 줄. `TradeRisk.css` 와 같은 조밀형
 * (본문 13px · 보조 12px · 옅은 면 `rgba(7,25,76,.04)` · 숫자 `tabular-nums`).
 *
 * 표본 부족은 **글자 굵기 + 배지**로 흐리게 한다 — 색을 옅게 하면 면 위에서 AA 를 못 넘는다(게이지와 같은 이유).
 */

export const mirrorList = style({
  fontFamily: vars.fontFamily.base,
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
});

export const mirrorItem = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(7, 25, 76, 0.04)",
  minWidth: 0,
});

export const mirrorHead = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
});

/** 옅은 면 위 — neutral 700 (600 은 4.26:1 로 AA 미달, 게이지와 같다) */
export const mirrorLabel = style({
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
});

export const mirrorText = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
  overflowWrap: "anywhere",
});

export const mirrorTextMuted = style([mirrorText, { color: vars.colors.neutral[700], fontWeight: vars.fontWeights.medium }]);

export const mirrorSub = style({
  margin: 0,
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  fontVariantNumeric: vars.numeric.tabular,
  overflowWrap: "anywhere",
});

export const tagCostList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const tagCostRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
});

/* ── 청산별 태그 ─────────────────────────────────────────── */

export const outcomeList = style({
  fontFamily: vars.fontFamily.base,
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
});

export const outcomeItem = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "12px 0",
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  selectors: { "&:first-child": { borderTop: "none" } },
});

export const outcomeHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
  minWidth: 0,
});

export const outcomePnl = style({
  flexShrink: 0,
  color: vars.colors.text.primary,
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
});

export const outcomeMeta = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
  color: vars.colors.neutral[600],
  fontSize: "12px",
  lineHeight: "18px",
  fontVariantNumeric: vars.numeric.tabular,
});

export const tagChip = style({
  display: "inline-flex",
  alignItems: "center",
  height: "22px",
  padding: "0 8px",
  borderRadius: "6px",
  background: "rgba(7, 25, 76, 0.06)",
  color: vars.colors.text.secondary,
  fontSize: "12px",
  fontWeight: vars.fontWeights.semibold,
});

/* ── 폼 한 줄(FR-19 · 시나리오 5) ───────────────────────── */

export const previewLines = style({
  margin: 0,
  padding: "10px 14px",
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  borderRadius: "12px",
  border: `1px solid ${vars.colors.neutral[200]}`,
});

export const previewLine = style({
  color: vars.colors.text.secondary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  fontVariantNumeric: vars.numeric.tabular,
  overflowWrap: "anywhere",
});

export const previewQuestion = style([previewLine, { color: vars.colors.text.primary, fontWeight: vars.fontWeights.semibold }]);
