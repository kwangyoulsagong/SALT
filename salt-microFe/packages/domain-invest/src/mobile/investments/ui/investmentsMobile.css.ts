import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 휴대폰 투자 탭(`FE-REQ-072`) — 목록 행 세로 12 · 왼쪽 그림 원 40 · 이름 `t5` · 보조 `t7`(`screen-mobile.md` §3) */
export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

export const row = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "4px 12px",
  minHeight: "44px",
  padding: "12px 0",
  color: vars.colors.text.primary,
  textDecoration: "none",
  WebkitTapHighlightColor: "transparent",
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px", borderRadius: "8px" },
});

export const main = style({ display: "flex", flexDirection: "column", gap: "2px", flex: "1 1 128px", minWidth: 0 });

export const name = style({
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.appType.body.fontWeight,
});

export const sub = style({
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
});

export const rate = style({
  marginLeft: "auto",
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});
export const up = style({ color: vars.colors.special.up });
export const down = style({ color: vars.colors.special.down });
export const flat = style({ color: vars.colors.text.tertiary });

export const chevron = style({ flexShrink: 0, color: vars.colors.neutral[400] });

export const note = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  color: vars.colors.neutral[700],
});

export const textLink = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  minHeight: "44px",
  color: vars.colors.brand.primary,
  fontSize: vars.appType.body.fontSize,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
});
