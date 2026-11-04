import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 챌린지 카드 — 가계부 표면과 같은 값. 끝난 카드도 같은 색(끝 ≠ 실패) */
export const card = style({ display: "flex", flexDirection: "column", gap: "12px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" });

export const form = style({ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "8px" });

export const amountField = style({ width: "160px" });

export const noteField = style({ flex: "1 1 160px", minWidth: 0 });

export const subTitle = style({ margin: 0, fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const list = style({ display: "flex", flexDirection: "column", gap: "4px", margin: 0, padding: 0, listStyle: "none" });

export const row = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "8px 0",
  borderTop: `1px solid rgba(7, 25, 76, 0.06)`,
});

export const rowText = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, fontSize: "13px", lineHeight: "20px", color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const rowSub = style({ fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: "8px" });

export const note = style({ margin: 0, minHeight: "16px", fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });
