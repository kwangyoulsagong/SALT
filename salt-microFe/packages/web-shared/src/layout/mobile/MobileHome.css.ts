import { globalStyle, style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 휴대폰 목록 행(`screen-mobile.md` §3) — 세로 여백 12 · 왼쪽 그림 40 · 이름 `t5` · 보조 `t7` · 값 오른쪽.
 * 높이는 고정하지 않는다 — 글자를 키우면(160 · 200%) 값이 다음 줄로 내려간다(`FE-REQ-072` FR-5)
 */
export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

export const row = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "4px 12px",
  minHeight: "44px",
  padding: "12px 0",
  color: vars.colors.text.primary,
  textDecoration: "none",
  WebkitTapHighlightColor: "transparent",
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px", borderRadius: "8px" },
});
// 3D 아이콘 = 원 40 자리(목록 왼쪽 그림)
globalStyle(`${row} > :first-child:not(span)`, { width: "40px", height: "40px", flexShrink: 0 });

export const rowMain = style({ display: "flex", flexDirection: "column", gap: "2px", flex: "1 1 128px", minWidth: 0 });

export const rowTitle = style({
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.appType.body.fontWeight,
});

export const rowSub = style({
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  fontWeight: vars.appType.caption.fontWeight,
  color: vars.colors.text.tertiary,
});

export const rowValue = style({
  marginLeft: "auto",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.fontWeights.bold,
});

/** 값 + 셰브론 — 오른쪽 끝에 붙어 같이 움직인다 */
export const rowEnd = style({ display: "inline-flex", alignItems: "center", gap: "8px", marginLeft: "auto" });

export const chevron = style({ flexShrink: 0, color: vars.colors.neutral[400] });

export const note = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  color: vars.colors.neutral[700],
});

/** 시작하기 배너 — 회색 면 한 줄 + 데스크톱 화면 링크 */
export const banner = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  padding: "16px 20px 8px",
  borderRadius: "20px",
  background: vars.colors.background.white,
});

/** 도메인 카드마다 흰 카드 한 장(Figma 홈 — 카드 사이 14 · 모서리 20). 안의 행은 그대로 */
export const cardStack = style({ display: "flex", flexDirection: "column", gap: "14px", margin: 0, padding: 0, listStyle: "none" });
export const cardItem = style({ padding: "8px 20px", borderRadius: "20px", background: vars.colors.background.white });

export const bannerText = style({
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const textLink = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  minHeight: "44px",
  color: vars.colors.brand.primary,
  fontSize: vars.appType.body.fontSize,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
});

/** 홈 머리 — 프로필 사진 48 · 이름 `t5` 굵게 · 이메일 `t7`(Figma "홈" 머리 — 회색 바탕 위, 카드 아님) */
export const profileHead = style({ display: "flex", alignItems: "center", gap: "12px", minHeight: "56px", padding: "4px 5px" });
export const profileText = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });
export const profileName = style({
  margin: 0,
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});
export const profileSub = style({
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
});
