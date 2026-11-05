import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

export const page = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  width: "100%",
  maxWidth: "768px",
  margin: "0 auto",
  padding: "20px 16px 40px",
  boxSizing: "border-box",
});

export const count = style({ margin: 0, fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const list = style({ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "12px" });

export const card = style({ display: "flex", flexDirection: "column", gap: "8px", padding: "16px", borderRadius: "12px", background: SURFACE.weakFill });

export const cardTitle = style({ margin: 0, fontSize: "12px", lineHeight: "16px", fontWeight: 600, color: "rgba(22, 31, 46, 0.64)" });

export const question = style({ margin: 0, fontSize: "15px", lineHeight: "22px", fontWeight: 600, color: vars.colors.text.primary, wordBreak: "keep-all" });

export const answer = style({ margin: 0, fontSize: "14px", lineHeight: "22px", color: vars.colors.text.primary, wordBreak: "keep-all" });

export const answerLabel = style({ fontWeight: 700, marginRight: "6px" });

export const explanation = style({ margin: 0, fontSize: "13px", lineHeight: "20px", color: vars.colors.text.primary, wordBreak: "keep-all" });

export const foot = style({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", fontSize: "12px", lineHeight: "16px", color: "rgba(22, 31, 46, 0.64)" });

export const link = style({ display: "inline-flex", alignItems: "center", gap: "2px", minHeight: "32px", color: vars.colors.text.primary, fontWeight: 600, textDecoration: "none" });
