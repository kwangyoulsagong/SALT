import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 지난 대화를 읽는 동안 — 대화 면(소개 · 칩 · 입력)과 비슷한 높이를 지킨다 */
export const placeholder = style({ minHeight: "320px" });

export const note = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
});
