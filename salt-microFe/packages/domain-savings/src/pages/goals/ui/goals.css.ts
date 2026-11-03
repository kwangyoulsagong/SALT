import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

export const page = style({ display: "flex", flexDirection: "column", gap: "16px", padding: "20px 24px 32px" });

export const head = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" });

export const list = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "12px",
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const side = style({ maxWidth: "560px" });

/** 새 목표 — 머리 오른쪽 작은 주 링크(32 높이 · 14/600 · 모서리 8, `screen-desktop.md` §3 버튼 값). 브라우저 기본 밑줄 링크를 쓰지 않는다 */
export const addLink = style({
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
