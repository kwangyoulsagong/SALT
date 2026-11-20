import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 휴대폰 가계부(`FE-REQ-072`) — 한 열 · 글자 `appType` 만 · 누름 칸 44 이상 */
export const status = style({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: vars.space.md });

export const note = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  color: vars.colors.neutral[700],
});

export const textLink = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "44px",
  color: vars.colors.brand.primary,
  fontSize: vars.appType.body.fontSize,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
});

export const asks = style({ display: "flex", flexDirection: "column", gap: vars.space.md, minWidth: 0, selectors: { "&:empty": { display: "none" } } });

export const calendar = style({ display: "flex", flexDirection: "column", gap: vars.space.lg, minWidth: 0 });

/** 고른 날 — 회색 면 · 모서리 12 */
export const day = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  padding: vars.space.lg,
  borderRadius: "12px",
  background: vars.colors.neutral[100],
});

export const dayHead = style({
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "2px 12px",
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const dayRows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });
