import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 반복 확인 카드 · 템플릿 편집 — 가계부 표면과 같은 값(경고 색 0) */
export const card = style({ display: "flex", flexDirection: "column", gap: "10px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const list = style({ display: "flex", flexDirection: "column", gap: "10px", margin: 0, padding: 0, listStyle: "none" });

export const item = style({ display: "flex", flexDirection: "column", gap: "8px" });

export const line = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "560px" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const row = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${SURFACE.weakFill}` });

export const rowMain = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

export const amountField = style({ maxWidth: "200px" });
