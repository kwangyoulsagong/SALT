import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 토글 · 설명 · 실패 줄 한 묶음. 패널 안 다른 칸과 같은 13px 설명 */
export const block = style({ display: "flex", flexDirection: "column", gap: vars.space.xs, fontFamily: vars.fontFamily.base });

export const hint = style({
  margin: 0,
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});
