import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

export const page = style({ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px 32px" });

export const head = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" });

export const actions = style({ display: "flex", gap: "8px" });

/** 머리 오른쪽 작은 링크(32 높이 · 14/600 · 모서리 8, `screen-desktop.md` §3) — 저축 `addLink` 와 같은 값 */
export const link = style({
  display: "inline-flex",
  alignItems: "center",
  height: "32px",
  padding: "0 12px",
  borderRadius: "8px",
  background: SURFACE.weakFill,
  color: vars.colors.text.primary,
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
  ":hover": { background: "rgba(7, 25, 76, 0.08)" },
});

export const monthNav = style({ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", lineHeight: "20px", fontWeight: 600 });

export const grid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: "16px",
  "@media": { "screen and (max-width: 1023px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const column = style({ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 });
