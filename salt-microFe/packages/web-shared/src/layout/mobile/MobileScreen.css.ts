import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 화면 한 장 — 회색 바탕 위 흰 카드를 쌓는다(사용자 Figma "홈" 390 실측, `FE-REQ-072` 2026-11-20): 좌우 15(카드 폭 360) · 카드 사이 14.
 * 넘침 0(긴 금액 · 이름은 줄바꿈)
 */
export const screen = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  minWidth: 0,
  padding: `${vars.space.lg} 15px ${vars.space.xl}`,
  overflowWrap: "anywhere",
});

/** 카드 — 흰 면 · 모서리 20 · 안쪽 20(Figma 실측). 그림자 없음 */
export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  minWidth: 0,
  padding: "20px",
  borderRadius: "20px",
  background: vars.colors.background.white,
});

export const head = style({ display: "flex", alignItems: "center", gap: vars.space.xs, minHeight: "44px", minWidth: 0 });

/** 뒤로 — 누름 칸 44 · 모노톤(`screen-mobile.md` §4 내비 바) */
export const backLink = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "44px",
  height: "44px",
  marginLeft: "-12px",
  borderRadius: "999px",
  color: vars.colors.text.primary,
  WebkitTapHighlightColor: "transparent",
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
});

/** 화면 제목 `t3` 22 Bold */
export const headTitle = style({
  flex: 1,
  minWidth: 0,
  margin: 0,
  fontSize: vars.appType.title.fontSize,
  lineHeight: vars.appType.title.lineHeight,
  fontWeight: vars.appType.title.fontWeight,
  color: vars.colors.text.primary,
});

/** 섹션 = 카드 한 장 */
export const section = style([card, { gap: vars.space.sm }]);

/** 섹션 머리 — 제목 폭 최대 2/3 · 오른쪽 글(`screen-mobile.md` §3) */
export const sectionHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: vars.space.md, flexWrap: "wrap" });

export const sectionTitle = style({
  maxWidth: "66%",
  margin: 0,
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.neutral[800],
});
