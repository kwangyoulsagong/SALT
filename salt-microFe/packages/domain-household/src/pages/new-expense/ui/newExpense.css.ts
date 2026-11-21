import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { card, lineCard } from "@repo/web-shared/ui/surface.css";

/** 지출 적기(`FE-REQ-060` FR-6) — 본문 폭은 입력 묶음 560(글 폭 상한 안), 사이드에 최근 쓴 내역 */
/**
 * 입력 카드(`FE-REQ-076` 2단계 — 카드 판 위 흰 카드). 폭 560 은 1280 이상 격자 칸(`split`)이 정한다 — 카드에 상한을 따로 두면 그보다 좁은 폭에서
 * 아래 "이번 달 지금까지" 카드(꽉 찬 폭)와 폭이 어긋났다(2026-11-21 900 실측)
 */
export const body = style([card, { gap: "16px" }]);

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
/** 사이드 빈 목록 한 줄 — 라벨 12/500 2단 */
export const sideEmpty = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});
export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

/** 폼 | 이번 달 지금까지 — 1280 이상 나란히 */
export const split = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "20px",
  alignItems: "start",
  "@media": { "screen and (min-width: 1280px)": { gridTemplateColumns: "minmax(0, 560px) minmax(0, 1fr)" } },
});

export const glance = style([lineCard, { gap: "12px" }]);

export const glanceHead = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" });

export const glanceTotal = style({
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});

export const glanceHint = style({
  marginTop: "-8px",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});
