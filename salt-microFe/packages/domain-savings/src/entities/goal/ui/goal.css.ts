import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 목표 카드 · 이정표 · 도달 시점 — 데스크톱 글자 위계(`screen-desktop.md` §2) 5단만 쓴다 */

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "100%",
  padding: "16px 20px",
  borderRadius: "12px",
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
  color: "inherit",
  textDecoration: "none",
  selectors: { "a&:hover": { background: SURFACE.weakFill } },
});

export const row = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const value = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: 600,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const bigValue = style([value, { fontSize: "18px", lineHeight: "24px", fontWeight: 700 }]);

export const box = style({ display: "flex", flexDirection: "column", gap: "6px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const grid = style({ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" });

export const cell = style({ display: "flex", flexDirection: "column", gap: "2px" });
