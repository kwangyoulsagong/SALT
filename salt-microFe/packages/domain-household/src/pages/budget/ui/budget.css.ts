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

/** 예산 칸 | 분류별로 쓴 돈 — 1280 이상 나란히 */
export const split = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "24px",
  alignItems: "start",
  "@media": { "screen and (min-width: 1280px)": { gridTemplateColumns: "minmax(0, 720px) minmax(0, 1fr)" } },
});

export const ratioCard = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: 0,
  padding: "20px",
  borderRadius: "12px",
  background: vars.colors.background.white,
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
  "@media": { "screen and (min-width: 1280px)": { position: "sticky", top: "16px" } },
});
