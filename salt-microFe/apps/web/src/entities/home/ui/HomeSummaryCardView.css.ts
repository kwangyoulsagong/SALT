import { style } from "@vanilla-extract/css";

import { vars } from "@repo/web-shared/ui/tokens.css";

/** 카드 전체가 링크다 — 밑줄 · 색만 걷는다. 누를 수 있다는 것은 셰브론 · 포커스 링으로 알린다 */
export const cardLink = style({
  display: "block",
  width: "100%",
  color: "inherit",
  textDecoration: "none",
  borderRadius: "16px",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});

export const head = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const values = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginTop: "12px",
});

/** 값 — 고정폭 숫자 · 굵게(`screen-desktop.md` §2). dd 기본 들여쓰기를 걷는다 */
export const value = style({
  margin: 0,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
});
