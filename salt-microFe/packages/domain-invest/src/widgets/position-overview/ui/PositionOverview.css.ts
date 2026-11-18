import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 아래 "내 보유" 패널과 띄운다 — 두 위젯이 형제로 놓인다 */
export const stack = style({ display: "grid", gap: 16, marginBottom: 16 });

export const emptyLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  color: vars.colors.text.secondary,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  ":hover": { color: vars.colors.text.primary },
});

/** 패널 머리 오른쪽 [거래 기록 추가] */
export const headAction = style({ marginLeft: "auto" });

/** 하단 링크 둘(FR-109) — 다른 페이지로 가니 오른쪽 셰브론 · 글자 링크 */
export const footLinks = style({ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "flex-end" });
