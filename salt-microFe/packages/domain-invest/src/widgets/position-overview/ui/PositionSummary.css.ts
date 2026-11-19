import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 칸 안 여백 — 격자 칸은 머리말만 있고 본문 여백은 내용이 둔다 */
export const summary = style({ display: "flex", flexDirection: "column", gap: vars.space.md, padding: vars.space.md });

/** 다른 페이지로 가는 줄 — 폭 100% · 오른쪽 셰브론(done 체크리스트 2절 6) */
export const detailLink = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  minHeight: "36px",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
  textDecoration: "none",
  ":hover": { color: vars.colors.text.primary },
});
