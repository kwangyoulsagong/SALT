import { style } from "@vanilla-extract/css";

import { vars as uiVars } from "@repo/ui/tokens";

/** 목록 행 세 칸 — 아이콘 판 32 · 글 · 시각(`screen-desktop.md` §4 날짜 묶음 목록 행). 행 전체가 버튼 */
export const row = style({
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  width: "100%",
  maxWidth: 720,
  minHeight: 56,
  padding: "8px 12px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  font: "inherit",
  color: "inherit",
  selectors: {
    "&:hover": { background: "rgba(7,25,76,.04)" },
    "&:focus-visible": { outline: `2px solid ${uiVars.colors.brand.primary}`, outlineOffset: 2 },
  },
});

export const iconPlate = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "rgba(7,25,76,.04)",
  color: "rgba(24,31,43,.77)",
});

export const text = style({ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 });

/** 제목 — 본문 13. 안 읽음은 굵게(700), 읽음은 보통(500) — 굵기 + 점, 색만으로 가르지 않는다 */
export const title = style({ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: uiVars.colors.desk.text1 });
export const titleUnread = style({ fontWeight: 700 });

export const hint = style({ fontSize: 12, lineHeight: "16px", fontWeight: 500, color: uiVars.colors.desk.text2 });

export const meta = style({ display: "inline-flex", alignItems: "center", gap: 6 });

export const time = style({
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 500,
  color: uiVars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const dot = style({ width: 6, height: 6, borderRadius: 999, background: uiVars.colors.brand.primary });
