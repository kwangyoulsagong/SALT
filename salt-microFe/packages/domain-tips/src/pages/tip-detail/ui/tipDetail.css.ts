import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

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

export const title = style({ margin: 0, fontSize: "18px", lineHeight: "24px", fontWeight: 700, color: vars.colors.text.primary, wordBreak: "keep-all" });

export const summary = style({ margin: 0, fontSize: "15px", lineHeight: "24px", color: "rgba(22, 31, 46, 0.64)", wordBreak: "keep-all", maxWidth: "720px" });

export const section = style({ display: "flex", flexDirection: "column", gap: "8px" });

export const sectionTitle = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const disclaimer = style({ margin: 0, fontSize: "12px", lineHeight: "16px", color: "rgba(22, 31, 46, 0.64)", maxWidth: "720px" });

/** 공식 링크 — 32 높이 버튼 모양(`screen-desktop.md` §3), 44 누름 칸은 줄 높이로 */
export const official = style({
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  minHeight: "44px",
  padding: "0 16px",
  borderRadius: "8px",
  background: vars.colors.text.primary,
  color: "#FFFFFF",
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: 600,
  textDecoration: "none",
});
