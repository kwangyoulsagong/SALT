import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { formBox } from "@repo/web-shared/ui/surface.css";

/** 챌린지 고르기 — 가계부 표면과 같은 값(경고 · 칭찬 색 0) */
export const form = style([formBox, { gap: "12px", maxWidth: "720px" }]);

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: "8px" });

export const period = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.text.tertiary });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" });
