import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 점검 칸 — AI 패널 맨 위(`FE-REQ-064` FR-3 · FR-6). 로딩 · 문장 · 점이 같은 높이를 차지한다(CLS 0).
 * 문장 한 줄은 720 까지(`screen-desktop.md` §2).
 */
const CHECK_MIN_HEIGHT = "132px";

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  minWidth: 0,
  maxWidth: "720px",
  minHeight: CHECK_MIN_HEIGHT,
});

export const headRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap",
});

/** 패널 이름 칩 13/600 모서리 7(실측, FR-6) */
export const nameChip = style({
  display: "inline-flex",
  alignItems: "center",
  height: "24px",
  padding: "0 8px",
  borderRadius: "7px",
  background: "rgba(7,25,76,.04)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

/** 맨 위 한 줄 — 15/600(FR-3). 서버 문장 그대로 */
export const summary = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  wordBreak: "keep-all",
});

/** 100칸 점 — 20 × 5, 분모 고정. 색은 방향을 뜻하지 않는다(칠함 · 빈칸 회색 두 단) */
export const dots = style({
  display: "grid",
  gridTemplateColumns: "repeat(20, 6px)",
  gap: "3px",
});

export const dot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: vars.colors.neutral[200],
});

export const dotOn = style({ background: vars.colors.neutral[700] });

export const meta = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const more = style({ minWidth: 0 });

export const moreSummary = style({
  cursor: "pointer",
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
});

export const moreList = style({
  margin: 0,
  padding: "4px 0 0",
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});
