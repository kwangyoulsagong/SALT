import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "560px" });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: "6px" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const hint = style({ minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const result = style({ display: "flex", flexDirection: "column", gap: "4px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const candidates = style({ display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, listStyle: "none" });

export const candidate = style({ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", borderRadius: "12px", boxShadow: SURFACE.hairline });

export const candidateHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" });

export const value = style({ fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const deleteButton = style({
  border: "none",
  background: "none",
  padding: "4px 6px",
  borderRadius: "6px",
  fontSize: "12px",
  lineHeight: "16px",
  color: vars.colors.neutral[600],
  cursor: "pointer",
  ":hover": { background: SURFACE.weakFill },
});
