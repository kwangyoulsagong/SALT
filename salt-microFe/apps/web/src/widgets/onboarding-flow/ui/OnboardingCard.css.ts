import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** "이어서 하기" 링크 — 다른 화면(온보딩)으로 가므로 셰브론을 글자와 한 줄에 둔다. */
export const ctaLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
});

/** 문장 왼쪽 · 다음 단계 장면 오른쪽 */
export const cardRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.lg,
});

export const spacing = style({
  marginBottom: vars.space.lg,
});
