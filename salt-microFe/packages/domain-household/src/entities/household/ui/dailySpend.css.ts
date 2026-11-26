import { style } from "@vanilla-extract/css";

import { growInY } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";
import { HOVER_TRANSITION } from "@repo/ui/transition";

/** 날마다 쓴 돈 막대 — 가계부 도메인 색(작은 표지), 높이 120 */
const HEIGHT = "120px";

export const frame = style({ display: "flex", flexDirection: "column", minWidth: 0 });

export const bars = style({
  display: "flex",
  alignItems: "stretch",
  gap: "3px",
  height: `calc(${HEIGHT} + 18px)`,
});

export const col = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch" });

export const hit = style({
  all: "unset",
  boxSizing: "border-box",
  // `all: unset` 이 전역 기본 전환(FE-REQ-062 FR-1)까지 지운다 — 여기서 다시
  transition: HOVER_TRANSITION,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  height: HEIGHT,
  borderRadius: "4px",
  cursor: "pointer",
  boxShadow: `inset 0 -1px 0 ${vars.colors.desk.line}`,
  selectors: {
    "&:hover": { background: "rgba(7, 25, 76, 0.04)" },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "1px" },
  },
});

const barBase = {
  display: "block",
  width: "100%",
  maxWidth: "14px",
  borderRadius: "3px 3px 0 0",
  ...growInY,
} as const;

export const bar = style({ ...barBase, background: "rgba(232, 89, 12, 0.32)" });
export const barSelected = style({ ...barBase, background: vars.colors.domain.household });

/** 안 쓴 날 — 바닥 점 */
export const dot = style({ display: "block", width: "4px", height: "4px", marginBottom: "2px", borderRadius: "999px", background: vars.colors.neutral[300] });
/** 오지 않은 날 — 더 옅은 점 */
export const futureDot = style({ display: "block", width: "4px", height: "4px", marginBottom: "2px", borderRadius: "999px", background: vars.colors.neutral[200] });

export const tick = style({
  height: "18px",
  textAlign: "center",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: "18px",
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
});
