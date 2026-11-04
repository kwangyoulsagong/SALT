import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 무지출 달력 — 스티커는 같은 회색 점 하나(색으로 칭찬하지 않는다). 쓴 날 · 기록 없는 날도 같은 글자색 */
export const box = style({ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const head = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const count = style({ fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const grid = style({ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px" });

export const weekday = style({ textAlign: "center", fontSize: "11px", lineHeight: "16px", color: vars.colors.neutral[600] });

const cellBase = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "36px",
  borderRadius: "8px",
  fontSize: "12px",
  lineHeight: "16px",
  fontVariantNumeric: "tabular-nums",
  color: vars.colors.text.primary,
});

export const cell = styleVariants({
  future: [cellBase, { color: vars.colors.neutral[600] }],
  spent: [cellBase],
  no_spend: [cellBase, { background: "rgba(7, 25, 76, 0.06)" }],
  blank: [cellBase],
});

export const dayNumber = style({ pointerEvents: "none" });

export const sticker = style({ position: "absolute", top: "4px", right: "4px", width: "6px", height: "6px", borderRadius: "50%", background: vars.colors.neutral[600] });

/** 칸 전체가 눌리는 버튼 — 부르는 쪽(feature)이 쓴다 */
export const dayButton = style({
  width: "100%",
  minHeight: "36px",
  border: "none",
  borderRadius: "8px",
  background: "transparent",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  selectors: { "&:hover": { background: "rgba(7, 25, 76, 0.06)" }, "&:disabled": { cursor: "default" } },
});

export const note = style({ margin: 0, fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });
