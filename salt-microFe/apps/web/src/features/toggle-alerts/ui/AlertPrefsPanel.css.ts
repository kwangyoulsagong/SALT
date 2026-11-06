import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 도메인 줄 셋 — 토글 · 한 줄 설명. 설정 화면 다른 패널과 같은 13px 설명 */
export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const row = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.md,
  minHeight: "44px",
  fontFamily: vars.fontFamily.base,
});

export const text = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

/** 줄 이름 — 설정 화면 본문 단(13/600) */
export const label = style({
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

/** 줄 설명 — 2단 글자색(`screen-desktop.md` §2). 회색 500(#8B95A1)은 흰 패널 위 3.03:1 로 AA 미달(2026-11-06 axe) — 새 칸이라 여기서만 고친다 */
export const hint = style({
  margin: 0,
  color: "rgba(22, 31, 46, 0.64)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/** 값이 오기 전 자리 — 줄 셋 높이(44 × 3 + 사이 8 × 2)를 지켜 값이 와도 패널이 밀리지 않게(2026-11-06 실화면 16px 차이) */
export const placeholder = style({ minHeight: "148px" });
