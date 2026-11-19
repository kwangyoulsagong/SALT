import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 지출 적기(`FE-REQ-060` FR-6) — 본문 폭은 입력 묶음 560(글 폭 상한 안), 사이드에 최근 쓴 내역 */
export const body = style({ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "560px", minWidth: 0 });

export const sideBlock = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });
export const sideHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" });
export const sideTitle = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});
export const sideLink = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
});
export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });
