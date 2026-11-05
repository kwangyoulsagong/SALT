import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 해 봉투 — 넘어도 같은 색(빨강 · 경고 색 0, 음수는 부호 글자로만) */
export const form = style({ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "720px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const row = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const value = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" });
