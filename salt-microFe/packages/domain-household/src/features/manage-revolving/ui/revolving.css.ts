import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 리볼빙 명세서 — 가계부 표면과 같은 값(경고 색 0) */
export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const card = style([form, { gap: "8px" }]);

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const fields = style({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" });

export const head = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" });

export const table = style({ width: "100%", borderCollapse: "collapse", fontSize: "13px", lineHeight: "20px", fontVariantNumeric: "tabular-nums" });

export const th = style({ padding: "6px 0", textAlign: "right", fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600], selectors: { "&:first-child": { textAlign: "left" } } });

export const td = style({ padding: "6px 0", textAlign: "right", fontWeight: 600, color: vars.colors.text.primary, borderTop: `1px solid ${SURFACE.weakFill}`, selectors: { "&:first-child": { textAlign: "left", fontWeight: 500 } } });
