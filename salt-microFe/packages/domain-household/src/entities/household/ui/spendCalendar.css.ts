import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 한 달 달력(`FE-REQ-060` FR-4) — 칸 7열 · 칸 높이 48 · 날 12/500 · 그날 돈 12/500 2단. 고른 칸은 옅은 면 + 1단 선 */
export const wrap = style({ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 });

export const grid = style({ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "2px", margin: 0, padding: 0, listStyle: "none" });

export const weekday = style({
  textAlign: "center",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const cell = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0px",
  width: "100%",
  minHeight: "48px",
  padding: "4px 2px",
  border: 0,
  borderRadius: "8px",
  background: "transparent",
  fontFamily: "inherit",
  color: vars.colors.desk.text1,
  cursor: "pointer",
  transition: `background-color ${vars.motion.duration.instant}`,
  selectors: {
    "&:hover:not(:disabled)": { background: vars.colors.desk.line },
    "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "-2px" },
    "&:disabled": { cursor: "default", color: vars.colors.desk.text2 },
    '&[aria-pressed="true"]': { background: vars.colors.desk.line, boxShadow: `inset 0 0 0 1px ${vars.colors.desk.text1}` },
  },
});

export const dayNumber = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});

export const amount = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

/** 안 쓴 날 — 회색 점(오른쪽 위). 색으로 칭찬하지 않는다 */
export const sticker = style({ position: "absolute", top: "4px", right: "4px", width: "6px", height: "6px", borderRadius: "50%", background: vars.colors.neutral[600] });

/** 챌린지 한 날 — 같은 회색 테두리 동그라미(왼쪽 위) */
export const challenge = style({
  position: "absolute",
  top: "3px",
  left: "3px",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  boxShadow: `inset 0 0 0 1.5px ${vars.colors.neutral[600]}`,
});
