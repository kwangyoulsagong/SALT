import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 목표 목록 행(`FE-REQ-060` FR-3) — 보조 줄 있는 행 56 · 호버 면 모서리 8 · 고른 행 = 같은 면(보라 0, 표 선택 보라 금지 결정).
 * 글자는 데스크톱 4단 토큰만
 */
const label = {
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
} as const;

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  minHeight: "56px",
  padding: "8px",
  border: "none",
  borderRadius: "8px",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  transition: `background-color ${vars.motion.duration.instant}, transform ${vars.motion.duration.instant}`,
  selectors: {
    "&:hover": { background: vars.colors.desk.line },
    '&[aria-current="true"]': { background: vars.colors.desk.line },
    "&:active": { transform: "scale(0.99)" },
  },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "-2px" },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:active": { transform: "none" } } } },
});

export const plate = style({
  ...label,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: vars.colors.desk.line,
  color: vars.colors.desk.text1,
  fontWeight: vars.fontWeights.semibold,
});

export const main = style({ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 });

export const title = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const caption = style({ ...label, overflowWrap: "anywhere" });

/** 진척 막대 4 — 길이는 `scaleX`(레이아웃 속성을 바꾸지 않는다) */
export const bar = style({ display: "block", width: "100%", maxWidth: "240px", height: "4px", borderRadius: "999px", background: vars.colors.desk.line, overflow: "hidden" });
export const barFill = style({ display: "block", width: "100%", height: "100%", background: vars.colors.graphic.primary, transformOrigin: "left center" });

export const side = style({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0, textAlign: "right" });

export const amount = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});

export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });
