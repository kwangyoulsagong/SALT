import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 보유 행 링크 — 글자 모양은 그대로, 호버 때만 옅은 면(표 행과 같은 모서리 8) */
export const holdingRow = style({
  display: "block",
  // 부모가 세로 flex(align start)라 늘려야 금액이 오른쪽 끝에 붙는다
  alignSelf: "stretch",
  color: "inherit",
  textDecoration: "none",
  borderRadius: 8,
  padding: "4px 8px",
  margin: "0 -8px",
  ":hover": { background: vars.colors.neutral[50] },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: 2 },
});
