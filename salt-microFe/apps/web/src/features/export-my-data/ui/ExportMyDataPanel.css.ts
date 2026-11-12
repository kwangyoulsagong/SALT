import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const actions = style({
  display: "flex",
  gap: vars.space.sm,
});

/** 패널 설명 — 공용 `panelDescription`(#8B95A1)은 흰 패널 위 3.03:1 로 AA 미달(2026-11-12 axe). 새 칸이라 여기서만 2단 글자색(알림 패널 줄 설명과 같은 값) */
export const description = style({
  margin: 0,
  color: "rgba(22, 31, 46, 0.64)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});
