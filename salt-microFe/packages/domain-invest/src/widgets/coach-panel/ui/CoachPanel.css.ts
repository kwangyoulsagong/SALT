import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 슬롯 묶음 — 부모 열이 `align-items: flex-start` 라 내용 폭으로 줄었다(실측 299px / 패널 490px) */
export const coachBlocks = style({
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

/** 시나리오 아래 성적 한 줄 — 라벨 단(12/500), 2단 글자색 */
export const trackLine = style({
  margin: 0,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
});

/** 자세히 보기 — 상세로 가는 링크는 폭 100% + 오른쪽 셰브론(done 체크리스트 §2-6) */
export const moreLink = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  minHeight: "36px",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  textDecoration: "none",
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" } },
});
