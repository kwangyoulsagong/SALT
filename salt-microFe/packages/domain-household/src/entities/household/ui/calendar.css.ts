import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 무지출 달력 — 스티커는 같은 회색 점 하나(색으로 칭찬하지 않는다). 쓴 날 · 기록 없는 날도 같은 글자색 */
export const box = style({ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const head = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const count = style({ fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const grid = style({ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px", margin: 0, padding: 0, listStyle: "none" });

/** 화면 읽기 프로그램에만 — 칸 상태 · 금액을 글자로(색 · 점만으로 전하지 않는다) */
export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

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

/** 챌린지 한 날(가계부 S1d) — 같은 회색의 테두리 동그라미(왼쪽 위). 무지출 점과 모양으로만 가른다 — 색으로 칭찬하지 않는다 */
export const challengeSticker = style({
  position: "absolute",
  top: "4px",
  left: "4px",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  border: `1.5px solid ${vars.colors.neutral[600]}`,
  boxSizing: "border-box",
  pointerEvents: "none",
});

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
