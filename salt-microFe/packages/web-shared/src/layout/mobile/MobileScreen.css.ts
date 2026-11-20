import { globalStyle, style } from "@vanilla-extract/css";

import { enterReveal } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

import { summary } from "./MobileSummary.css";

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

/**
 * 상세 화면 — 카드 쌓기가 아니라 **흰 섹션을 화면 폭 꽉 차게, 섹션 사이 회색 띠 16**(기준 화면 분석 §1 · §2).
 * 목표 상세 · 종목 상세 · 코치 리포트. 섹션 제목은 22 Bold
 */
export const detailScreen = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
  paddingBottom: vars.space.xl,
  overflowWrap: "anywhere",
});
/** 상세의 머리 칸 — 흰 면 위(위 여백 · 좌우 20) */
export const detailTop = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  padding: `${vars.space.sm} 20px 24px`,
  background: vars.colors.background.white,
});

/** 카드 — 흰 면 · 모서리 20 · 안쪽 20(Figma 실측). 그림자 없음 */
export const card = style({
  // 카드가 차례로 8px 아래에서 떠오른다(블록 등장 — `motion.md` §1, 형제 차례 · 동작 줄이기면 끔)
  ...enterReveal,
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

// 상세 화면 안의 섹션 · 요약은 카드가 아니라 꽉 찬 흰 면(모서리 0 · 좌우 20 · 위아래 24)
globalStyle(`${detailScreen} > ${section}`, { borderRadius: 0, padding: "24px 20px" });
globalStyle(`${detailScreen} ${sectionTitle}`, {
  maxWidth: "none",
  fontSize: vars.appType.title.fontSize,
  lineHeight: vars.appType.title.lineHeight,
  fontWeight: vars.appType.title.fontWeight,
  color: vars.colors.text.primary,
});
// 상세 머리 안 요약은 카드가 아니다 — 흰 머리 칸에 그대로
globalStyle(`${detailTop} ${summary}`, { padding: 0, borderRadius: 0 });
