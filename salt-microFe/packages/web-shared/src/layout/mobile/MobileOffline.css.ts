import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 마지막 화면 한 벌(`FE-REQ-073` FR-2) — 탭 화면 카드 쌓기 위 맨 위 띠 하나 */
export const view = style({ display: "flex", flexDirection: "column", gap: "14px" });

/** 띠 — 회색 바탕 위 흰 알약 아님: 옅은 grey200 면 · 가운데 · `t7`. 오류가 아니라 사실이라 빨강 · 느낌표 0 */
export const band = style({
  margin: 0,
  padding: "10px 16px",
  borderRadius: "12px",
  background: vars.colors.neutral[200],
  color: vars.colors.neutral[800],
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
});

export const rows = style({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" });

export const row = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 0",
  selectors: { "& + &": { borderTop: `1px solid ${vars.colors.neutral[100]}` } },
});

export const rowMain = style({ display: "flex", flexDirection: "column", minWidth: 0, gap: "2px" });

export const rowLabel = style({
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  color: vars.colors.neutral[800],
  wordBreak: "keep-all",
});

export const rowSub = style({
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
});

export const rowValue = style({
  flexShrink: 0,
  maxWidth: "55%",
  textAlign: "right",
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.neutral[900],
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
});

export const note = style({
  margin: "0 20px",
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
  textAlign: "center",
});
