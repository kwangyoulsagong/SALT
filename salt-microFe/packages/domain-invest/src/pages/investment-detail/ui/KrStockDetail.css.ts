import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 호가 · 투자자 한 탭(2026-11-20) — 호가 사다리(3열 · 폭 상한 520)와 투자자 표가 따로 탭이면 넓은 패널 오른쪽 60% 가 비었다.
 * 화면 폭이 아니라 **칸 폭**으로 가른다(1280 이상에선 오른쪽 고정 열 360 이 본문을 줄인다 — 1440 에서 투자자 표가 잘렸다).
 * 칸이 1000 이상이면 나란히(사다리 440 · 투자자 나머지), 아니면 위아래로 각자 칸 폭을 다 쓴다
 */
export const bookWrap = style({ containerType: "inline-size", minWidth: 0 });

export const bookGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: vars.space.lg,
  alignItems: "start",
  "@container": { "(min-width: 1000px)": { gridTemplateColumns: "minmax(0, 440px) minmax(0, 1fr)" } },
});

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
