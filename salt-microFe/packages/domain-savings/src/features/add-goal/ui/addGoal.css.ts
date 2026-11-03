import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

export const form = style({ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "560px" });

export const fieldset = style({ display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, border: 0 });

export const legend = style({ marginBottom: "8px", fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: "8px" });

export const hint = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const result = style({ display: "flex", flexDirection: "column", gap: "6px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const resultRow = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" });

export const resultValue = style({ fontSize: "18px", lineHeight: "24px", fontWeight: 700, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });
