import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const scopeTitle = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

/** 범위 줄 — 알림 패널 설명과 같은 2단 글자색(흰 패널 위 AA, 2026-11-06) */
export const scopeList = style({
  margin: `${vars.space.xs} 0 0`,
  paddingLeft: "18px",
  color: "rgba(22, 31, 46, 0.64)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

export const form = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.sm,
});

export const field = style({
  flex: "1 1 220px",
  minWidth: 0,
});

/** 패널 설명 — 공용 `panelDescription`(#8B95A1)은 흰 패널 위 3.03:1 로 AA 미달(2026-11-12 axe). 새 칸이라 여기서만 2단 글자색(알림 패널 줄 설명과 같은 값) */
export const description = style({
  margin: 0,
  color: "rgba(22, 31, 46, 0.64)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/** 범위가 오기 전 자리 — 줄 여섯 높이(뒤집혀 보이지 않게) */
export const scopePlaceholder = style({
  height: "120px",
});
