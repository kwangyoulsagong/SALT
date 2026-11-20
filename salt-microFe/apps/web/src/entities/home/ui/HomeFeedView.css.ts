import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/**
 * 홈 둘째 줄 패널(`FE-REQ-048` FR-13) — 카드와 같은 면(흰 면 · 모서리 16 · 안쪽 선, 그림자 없음).
 * 행 = 왼쪽 3D 아이콘 · 이름(13/600) + 한 줄(12/500 2단) · 금액 오른쪽(고정폭 숫자) — `screen-desktop.md` §4 날짜 묶음 목록의 행과 같은 세 칸
 */
export const panel = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  padding: `${vars.space.lg} ${vars.space.md} ${vars.space.md}`,
  borderRadius: SURFACE.panelRadius,
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
  // 앱 웹뷰 — 흰 바탕 한 열이라 패널 면 · 선을 걷고 섹션으로(`FE-REQ-060` FR-M3)
  selectors: { [IN_APP_WEBVIEW]: { padding: "8px 0 0", boxShadow: "none" } },
});

export const panelHead = style({ display: "flex", alignItems: "center", minHeight: "28px", padding: `0 ${vars.space.sm}`, marginBottom: vars.space.xs });

export const panelTitle = style({
  margin: 0,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  color: vars.colors.desk.text1,
  // 앱 웹뷰 섹션 머리 = `t5`
  selectors: { [IN_APP_WEBVIEW]: { fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight, fontWeight: vars.appType.body.fontWeight } },
});

export const list = style({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" });

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  minHeight: "56px",
  padding: `${vars.space.sm}`,
  borderRadius: "8px",
  color: "inherit",
  textDecoration: "none",
  transition: `background ${vars.motion.duration.instant}`,
  selectors: {
    "&:hover": { background: SURFACE.weakFill },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
  },
});

export const main = style({ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 });

export const rowTitle = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const rowSub = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  // 앱 웹뷰 보조 = `t7` 13(웹뷰 글자 13 이상 — `ADR-012` 로 PWA `/m` 에 옮김)
  selectors: { [IN_APP_WEBVIEW]: { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight } },
});

export const amount = style({
  flexShrink: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});

/** 빈 상태 — 무엇이 여기 모이는지 · 어떻게 채우는지 한 줄(리서치: 빈 영역은 무엇이 생기는지 말한다) */
export const empty = style({
  margin: 0,
  padding: `${vars.space.md} ${vars.space.sm}`,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: 500,
  color: vars.colors.desk.text2,
});
