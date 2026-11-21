import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { card, SURFACE } from "@repo/web-shared/ui/surface.css";


export const grid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: "16px",
  alignItems: "start",
  "@media": { "(max-width: 1023px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const column = style({ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 });

export const sectionTitle = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const nav = style({ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const link = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary });

export const note = style({ margin: 0, fontSize: "12px", lineHeight: "16px", color: vars.colors.text.tertiary });

export const list = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none", maxWidth: "720px" });

export const person = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  width: "100%",
  padding: "10px 0",
  borderBottom: `1px solid ${SURFACE.weakFill}`,
  color: vars.colors.text.primary,
  textDecoration: "none",
});

export const personMain = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

export const personName = style({ fontSize: "14px", lineHeight: "20px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

/**
 * 목록 묶음 카드(`FE-REQ-076` 2단계) — 같은 열의 폼 카드(주고받은 돈 · 경조사 봉투, 720)와 폭을 맞춘다. 한 열로 접히는 1024 미만에서 폼 720 · 목록 꽉 찬 폭으로
 * 어긋났다(2026-11-21 900 실측)
 */
export const block = style([card, { maxWidth: "720px" }]);
