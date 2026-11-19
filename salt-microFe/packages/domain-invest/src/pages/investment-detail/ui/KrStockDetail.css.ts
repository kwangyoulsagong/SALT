import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** 내 거래 패널 안 칸 — 주문 전 체크 · 거래 기록을 선으로 가른다(코인 상세 `tradeCell` 과 같은 값) */
export const tradeCell = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: 0,
  selectors: {
    "& + &": { paddingTop: "16px", borderTop: `1px solid ${vars.colors.neutral[100]}` },
  },
});
