import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 챌린지 머리 — 가계부 표면과 같은 글자 값(경고 · 칭찬 색 0) */
export const head = style({ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 });

export const titleRow = style({ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 });

export const title = style({
  margin: 0,
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: 600,
  color: vars.colors.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const meta = style({ margin: 0, fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const numbers = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 12px",
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});
