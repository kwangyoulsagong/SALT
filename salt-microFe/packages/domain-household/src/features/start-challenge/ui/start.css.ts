import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 챌린지 고르기 — 가계부 표면과 같은 값(경고 · 칭찬 색 0) */
export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: "8px" });

export const period = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" });
