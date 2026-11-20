import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 오른쪽 칸(사이드 312) 목록 행 — 52 · 왼쪽 아이콘 · 이름 + 한 줄 · 셰브론(`FE-REQ-048` FR-8 · 리서치 — 참고 홈 오른쪽 칸은 카드가 아니라 목록 행) */
export const block = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });

export const blockTitle = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  minHeight: "52px",
  padding: `${vars.space.sm} ${vars.space.sm}`,
  borderRadius: "10px",
  color: "inherit",
  textDecoration: "none",
  // 누름 0.99 — 목록 행과 같은 장치(`motion.md`, 2026-11-20 팁 사이드에서 빠진 것을 찾음 — 홈 사이드도 같이). 줄인 모션이면 끔
  transition: `background-color ${vars.motion.duration.instant}, transform ${vars.motion.duration.instant}`,
  ":hover": { background: vars.colors.desk.line },
  ":active": { transform: "scale(0.99)" },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:active": { transform: "none" } } } },
});

export const text = style({ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 });

export const name = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const hint = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});
