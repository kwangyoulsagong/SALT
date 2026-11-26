import { style, styleVariants } from "@vanilla-extract/css";

import { growInX } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

/**
 * 목표 목록 아래 두 블록(2026-11-26) — 이번 달 계획 대비 막대 · 도달 예상 달 축. 저축 색(`colors.domain.savings`) · 막대는 처음 그릴 때 차오른다(transform 만)
 */
export const rows = style({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: vars.space.md });

export const row = style({
  display: "grid",
  gridTemplateColumns: "36px minmax(80px, 160px) minmax(0, 1fr) auto",
  alignItems: "center",
  gap: vars.space.md,
  minHeight: "40px",
});

/** 목표 그림 판 — 목록 행과 같은 옅은 저축 색 원 · 선 아이콘 18 */
export const plate = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "rgba(9, 146, 104, 0.1)",
  color: vars.colors.domain.savings,
});

export const name = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const figure = style({
  textAlign: "right",
  whiteSpace: "nowrap",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
});

/** 막대 칸 — 옅은 바탕 위에 계획 자리(점선 끝) · 넣은 돈(채움) */
export const track = style({ position: "relative", height: "12px", borderRadius: "6px", background: vars.colors.neutral[100] });

export const planMark = style({
  position: "absolute",
  top: "-3px",
  bottom: "-3px",
  width: "2px",
  borderRadius: "1px",
  background: vars.colors.desk.text2,
});

export const fill = style({
  ...growInX,
  position: "absolute",
  inset: "0 auto 0 0",
  borderRadius: "6px",
});

export const fillTone = styleVariants({
  met: { background: vars.colors.domain.savings },
  under: { background: "rgba(9, 146, 104, 0.45)" },
  none: { background: vars.colors.neutral[300] },
});

// ── 도달 예상 ────────────────────────────────────────────────────

export const axis = style({
  display: "grid",
  gridTemplateColumns: "36px minmax(80px, 160px) minmax(0, 1fr) auto",
  gap: vars.space.md,
  alignItems: "end",
});

export const axisLabels = style({
  display: "flex",
  justifyContent: "space-between",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
});

export const lane = style({ position: "relative", height: "12px", borderRadius: "6px", background: vars.colors.neutral[100] });

export const range = style({
  ...growInX,
  position: "absolute",
  top: 0,
  bottom: 0,
  borderRadius: "6px",
  background: "rgba(9, 146, 104, 0.35)",
});

export const dot = style({
  position: "absolute",
  top: "50%",
  width: "12px",
  height: "12px",
  marginLeft: "-6px",
  marginTop: "-6px",
  borderRadius: "50%",
  background: vars.colors.domain.savings,
  boxShadow: `0 0 0 2px ${vars.colors.background.white}`,
});

export const caption = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});
