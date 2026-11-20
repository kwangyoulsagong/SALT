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

/** 아이콘 판 — 44 · 모서리 12 · 옅은 회색 면, 3D 그림 28(기준 화면 분석 §11) */
export const iconTile = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: vars.colors.neutral[100],
});
globalStyle(`${iconTile} img`, { width: "28px", height: "28px" });

/** 주인공 금액 — `t3` 22 Bold. 없음 · 받지 못함은 보조 크기(0 과 없음을 가른다) */
export const lead = style({
  fontSize: vars.appType.title.fontSize,
  lineHeight: vars.appType.title.lineHeight,
  fontWeight: vars.appType.title.fontWeight,
  fontVariantNumeric: "tabular-nums",
  color: vars.colors.text.primary,
});
export const leadQuiet = style({
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[600],
});

/** 회색 알약 — grey100 · 모서리 12 · 15 Semibold. 카드 전체가 누름 칸이라 알약은 모양만 */
export const pill = style({
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  marginLeft: "auto",
  minHeight: "36px",
  padding: "0 14px",
  borderRadius: "12px",
  background: vars.colors.neutral[100],
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
  whiteSpace: "nowrap",
});

/** 카드 바닥 줄 — 위 1px 선 · 보조 값 한 줄(이름 · 값) */
export const cardFoot = style({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "2px 12px",
  margin: "4px 0 0",
  padding: "12px 0 8px",
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  color: vars.colors.neutral[600],
});
export const cardFootValue = style({ fontWeight: vars.fontWeights.semibold, color: vars.colors.neutral[800], fontVariantNumeric: "tabular-nums" });
