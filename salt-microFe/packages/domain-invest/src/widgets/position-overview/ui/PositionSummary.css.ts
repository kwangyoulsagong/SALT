import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 여백 0 — 놓는 자리(코치 대화 옆 칸)가 묶음 제목과 같은 왼쪽 끝을 준다. 옛 격자 칸 여백(12)이 남아 옆 칸에서만 들여쓰기가 됐다
 * (2026-11-19 사용자 "정렬" — "코치 리포트에서 보기"와 꺾쇠 위치도 12 달랐다)
 */
export const summary = style({ display: "flex", flexDirection: "column", gap: vars.space.md });

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
