import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 오프라인 한 줄 — 라벨 단 12/500 · 2단 글자색(AA) */
export const offlineNote = style({
  margin: 0,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
});
