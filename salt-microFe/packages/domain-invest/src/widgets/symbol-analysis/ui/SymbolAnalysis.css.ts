import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 코인 상세 본문(`FE-REQ-049`) — 틀(알약 탭 · 고정 열)은 `@repo/web-shared/ui` `DetailTabs`, 패널 면은 `detailPanel`.
 * 여기는 내 거래 패널 안 칸 가르기만 둔다
 */

/** 내 거래 패널 안의 칸 — 주문 전 체크 · 계획(내 선) · 거래 기록이 카드 셋이 아니라 한 패널 안 칸이 된다(선으로 가른다) */
export const tradeCell = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: 0,
  selectors: {
    "& + &": { paddingTop: "16px", borderTop: `1px solid ${vars.colors.neutral[100]}` },
  },
});

/** 칸 안 접힘(익절 플랜) — 제목 줄만 누름 */
export const foldSummary = style({
  cursor: "pointer",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" } },
});
