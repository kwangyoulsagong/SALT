import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 공개 화면 — 휴대폰 폭 16px 여백부터(FE-REQ-058 FR-7). 글 한 줄 최대 720 */
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

export const list = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" });

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  background: SURFACE.weakFill,
  color: vars.colors.text.primary,
  textDecoration: "none",
  boxSizing: "border-box",
  ":hover": { background: "rgba(7, 25, 76, 0.08)" },
});

export const itemText = style({ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: 1 });

export const itemTitle = style({ fontSize: "14px", lineHeight: "20px", fontWeight: 600, wordBreak: "keep-all" });

export const itemSummary = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "rgba(22, 31, 46, 0.64)", wordBreak: "keep-all" });

export const itemMeta = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: "rgba(22, 31, 46, 0.64)" });

export const badge = style({ marginRight: "8px", fontWeight: 600, color: vars.colors.status.warningDark });
