import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "../styles/tokens.css";

export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  minWidth: 0,
  outline: "none",
  borderRadius: vars.radius.base,
  selectors: {
    "&:focus-visible": { boxShadow: `0 0 0 2px ${vars.colors.border.focus}` },
  },
});

export const legend = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  minHeight: "40px",
  flex: "1 1 280px",
  minWidth: 0,
  fontSize: vars.fontSizes.sm,
  color: vars.colors.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const legendRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  columnGap: vars.space.md,
  rowGap: vars.space.xs,
});

export const legendTerm = style({ color: vars.colors.text.tertiary, marginRight: "2px" });

export const change = styleVariants({
  up: { color: vars.colors.special.up },
  down: { color: vars.colors.special.down },
  flat: { color: vars.colors.text.tertiary },
});

export const averageToggle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.xs,
  padding: 0,
  border: 0,
  background: "none",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  selectors: {
    '&[aria-pressed="false"]': { opacity: 0.4 },
  },
});

export const swatch = style({
  display: "inline-block",
  width: "10px",
  height: "2px",
  borderRadius: "1px",
});

export const plot = style({
  position: "relative",
  width: "100%",
  /** 가로 드래그는 차트가, 세로 스와이프는 페이지 스크롤이 (`FE-REQ-034` FR-24) */
  touchAction: "pan-y",
  cursor: "crosshair",
  userSelect: "none",
  WebkitUserSelect: "none",
});

export const canvas = style({
  position: "absolute",
  inset: 0,
  display: "block",
});

export const volumeLegend = style({
  position: "absolute",
  left: vars.space.xs,
  display: "flex",
  gap: vars.space.sm,
  fontSize: vars.fontSizes.xs,
  color: vars.colors.text.tertiary,
  pointerEvents: "none",
  fontVariantNumeric: "tabular-nums",
});

/** 좁은 폭에서는 버튼이 범례 아래로 내려간다 — 한 줄을 나누면 범례가 한 항목씩 세로로 늘어선다(375px 실측) */
export const header = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space.md,
});

export const controls = style({
  display: "flex",
  flexShrink: 0,
  gap: vars.space.xs,
});

export const empty = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.colors.text.tertiary,
  fontSize: vars.fontSizes.base,
});

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
