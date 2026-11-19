import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "560px" });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: "6px" });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary });

export const hint = style({ minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.text.tertiary });

export const result = style({ display: "flex", flexDirection: "column", gap: "4px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.infoFill, boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}` });

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
  color: vars.colors.text.tertiary,
  cursor: "pointer",
  ":hover": { background: SURFACE.weakFill },
});

/* ── 사이드 빠른 입력(`FE-REQ-060` FR-6) ─────────────────────── */
export const compactForm = style({ maxWidth: "none", gap: "10px" });
export const more = style({ display: "flex", flexDirection: "column" });
export const moreSummary = style({
  cursor: "pointer",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" } },
});
export const moreBody = style({ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" });
export const submitInline = style({ alignSelf: "flex-start", minWidth: "96px" });
