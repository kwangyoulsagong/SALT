import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 사람 장부 — 가계부 표면과 같은 값. 준 돈 · 받은 돈은 글자로만 가른다(색으로 가르지 않는다) */
export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const fields = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: "8px" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" });

export const list = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none", maxWidth: "720px" });

export const item = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${SURFACE.weakFill}` });

export const itemMain = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

export const itemTitle = style({ fontSize: "14px", lineHeight: "20px", fontWeight: 500, color: vars.colors.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export const itemSide = style({ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 });

export const value = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });
