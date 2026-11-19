import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 예산 화면 사이드 묶음(`FE-REQ-060` FR-7) — 제목 13/600 */
export const sideBlock = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });

export const sideTitle = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});
