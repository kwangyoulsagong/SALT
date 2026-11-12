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
