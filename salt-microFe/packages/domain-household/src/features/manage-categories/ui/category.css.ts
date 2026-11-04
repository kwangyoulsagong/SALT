import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "640px" });

export const list = style({ display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, listStyle: "none" });

export const row = style({ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", minHeight: "32px" });

export const editor = style({ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: "8px" });

export const main = style({ display: "flex", flexDirection: "column", gap: "2px" });

export const name = style({ fontSize: "14px", lineHeight: "20px", fontWeight: 500, color: vars.colors.text.primary });

export const actions = style({ display: "flex", alignItems: "center", gap: "8px" });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });
