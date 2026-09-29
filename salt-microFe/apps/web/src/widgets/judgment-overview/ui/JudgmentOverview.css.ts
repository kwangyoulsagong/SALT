import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@/shared/ui/surface.css";

/**
 * 요약 띠 — 흰 패널 하나에 칸 셋(PC 3열 · 1024px 이하 한 줄씩). 칸은 링크 전체다(셰브론 규칙: 폭 100%).
 * 높이를 칸 내용과 같게 고정해 수화 · 로딩 때 시세 보드가 튀지 않게 한다(`CELL_MIN_HEIGHT`).
 */
const CELL_MIN_HEIGHT = "76px";

export const strip = style({
  display: "grid",
  // 목표 비중 칸은 고지 한 줄이 길어 넓게
  gridTemplateColumns: "minmax(0, 1.6fr) repeat(2, minmax(0, 1fr))",
  marginTop: vars.space.xl,
  borderRadius: SURFACE.panelRadius,
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
  overflow: "hidden",
  "@media": { "screen and (max-width: 1024px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

/** 수화 전 자리 — 띠와 같은 높이(로그아웃이면 수화 뒤 사라진다) */
export const stripPending = style({ minHeight: "1px" });

export const cell = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  minHeight: CELL_MIN_HEIGHT,
  padding: "14px 20px",
  color: "inherit",
  textDecoration: "none",
  boxSizing: "border-box",
  selectors: {
    "& + &": { borderLeft: `1px solid ${vars.colors.neutral[100]}` },
    "&:hover": { background: SURFACE.weakFill },
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[900]}`, outlineOffset: "-2px" },
  },
  "@media": {
    "screen and (max-width: 1024px)": {
      selectors: { "& + &": { borderLeft: "none", borderTop: `1px solid ${vars.colors.neutral[100]}` } },
    },
  },
});

export const cellBody = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 });

export const cellLabel = style({
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
});

export const cellValue = style({
  color: vars.colors.neutral[900],
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
  // 자르지 않는다 — 360 에서 "현금 …" 으로 잘려 현금 몫이 사라졌다(2026-09-29)
  overflowWrap: "anywhere",
});

/** 고지 한 줄 — 늘 읽혀야 해서 neutral 700(AA). **자르지 않는다** — 자르면 실패 사례가 먼저 사라진다 */
export const cellNote = style({
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  fontVariantNumeric: vars.numeric.tabular,
});
