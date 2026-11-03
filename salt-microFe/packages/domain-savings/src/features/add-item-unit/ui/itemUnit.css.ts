import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px" });

export const list = style({ display: "flex", flexDirection: "column", gap: "6px", margin: 0, padding: 0, listStyle: "none" });

export const row = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" });

export const value = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const label = style({ minHeight: "16px", fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });
