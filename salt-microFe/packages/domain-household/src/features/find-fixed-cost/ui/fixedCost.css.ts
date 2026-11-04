import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 고정비 카드 — 반복 확인 카드와 같은 표면(경고 색 0) */
export const card = style({ display: "flex", flexDirection: "column", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const description = style({ margin: 0, fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const list = style({ display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: 0, listStyle: "none" });

export const item = style({ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" });

export const actions = style({ display: "flex", alignItems: "center", gap: "8px" });

export const note = style({ display: "flex", alignItems: "center", gap: "8px", margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });
