import { globalStyle, style } from "@vanilla-extract/css";

import { enterReveal } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

import { press, pressed } from "./MobilePress.css";

/** 바로가기 목록 카드 — 아이콘 32 · 이름 `t5` · 셰브론(기준 화면 분석 §11 목록 카드) */
export const list = style({
  ...enterReveal,
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: "8px 0",
  listStyle: "none",
  borderRadius: "20px",
  background: vars.colors.background.white,
});

export const row = style({
  ...press,
  display: "flex",
  alignItems: "center",
  gap: "14px",
  minHeight: "56px",
  padding: "6px 20px",
  color: vars.colors.text.primary,
  textDecoration: "none",
  selectors: { "&:active": { ...pressed, background: vars.colors.neutral[50] } },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
});

export const icon = style({ display: "inline-flex", width: "32px", height: "32px", flexShrink: 0 });
globalStyle(`${icon} img`, { width: "32px", height: "32px" });

export const main = style({ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0, wordBreak: "keep-all" });

export const label = style({
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.fontWeights.semibold,
});

export const hint = style({
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
});

export const chevron = style({ flexShrink: 0, color: vars.colors.neutral[400] });
