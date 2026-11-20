import { style } from "@vanilla-extract/css";

import { ON_MOBILE } from "@repo/core/mobile";
import { vars } from "@repo/ui/tokens";

/**
 * 저축 도구 접힘(`FE-REQ-060` FR-8 → `FE-REQ-072` 위젯으로 내림). 데스크톱 사이드는 본문 13/600 머리 · 라벨 12,
 * 휴대폰(`/m/goals` 목록 아래)은 섹션 행 48 · `t5` · 보조 13(`screen-mobile.md` §3 · 글자 13 이상)
 */
const title = {
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
} as const;

export const hint = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  selectors: { [ON_MOBILE]: { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight } },
});

export const fold = style({ display: "flex", flexDirection: "column", gap: "8px" });

export const foldSummary = style({
  ...title,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "32px",
  borderRadius: "8px",
  cursor: "pointer",
  listStyle: "none",
  padding: "0 4px",
  selectors: {
    [ON_MOBILE]: { minHeight: "48px", fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight, color: vars.colors.text.primary },
    "&::-webkit-details-marker": { display: "none" },
    // 펼칠 수 있다는 표지 — 오른쪽 셰브론, 열리면 아래로(2026-11-20 도구 접기)
    "&::after": {
      content: '""',
      width: "7px",
      height: "7px",
      borderRight: `1.5px solid ${vars.colors.desk.text2}`,
      borderBottom: `1.5px solid ${vars.colors.desk.text2}`,
      transform: "rotate(-45deg)",
      transition: `transform ${vars.motion.duration.instant}`,
    },
    "details[open] > &::after": { transform: "rotate(45deg)" },
    "&:hover": { background: "rgba(7, 25, 76, 0.04)" },
  },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
});
