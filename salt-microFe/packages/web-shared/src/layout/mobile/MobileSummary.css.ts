import { globalStyle, style } from "@vanilla-extract/css";

import { enterReveal } from "@repo/ui/enterReveal";

import { vars } from "@repo/ui/tokens";

/**
 * 휴대폰 요약(`screen-mobile.md` §1 · §3) — 주인공 숫자 하나(`appType.hero` 30) + 그 아래 줄(이름 · 값).
 * 금액은 잘리지 않고 줄바꿈(글자 160 · 200% — `FE-REQ-072` FR-5)
 */
/** 요약도 카드 한 장(회색 바탕 위 — Figma 홈 첫 카드) */
export const summary = style({
  ...enterReveal,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  margin: 0,
  padding: "20px",
  borderRadius: "20px",
  background: vars.colors.background.white,
  wordBreak: "keep-all",
});

/** 줄 묶음(주인공이 없을 때 · 상세 머리) */
export const lines = style({ display: "flex", flexDirection: "column", gap: "12px", margin: 0 });

/* ── 금액 카드(`FE-REQ-074` FR-1 — 홈 도메인 카드와 같은 금액 행) ── */

export const amountRow = style({ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 });

/** 아이콘 판 44 · 모서리 12 · grey100 + 3D 그림 28(`mobile-design.md` §2) */
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

/** 금액 위 · 이름 아래 — dt/dd 순서는 그대로 두고 보이는 순서만 바꾼다 */
export const amountMain = style({ display: "flex", flexDirection: "column-reverse", gap: "2px", flex: 1, minWidth: 0, margin: 0 });
export const amountValue = style({
  margin: 0,
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
  fontSize: vars.appType.title.fontSize,
  lineHeight: vars.appType.title.lineHeight,
  fontWeight: vars.appType.title.fontWeight,
  color: vars.colors.text.primary,
});
export const amountLabel = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.appType.desc.fontWeight,
  color: vars.colors.text.tertiary,
});

/** 카드 바닥 줄 — 위 1px grey100 · 나머지 칸(홈 카드 바닥 줄과 같다) */
export const foot = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  margin: "4px 0 0",
  padding: "14px 0 0",
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
});

export const hero = style({ display: "flex", flexDirection: "column", gap: "2px", margin: 0 });

export const heroLabel = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.appType.desc.fontWeight,
  color: vars.colors.text.tertiary,
});

export const heroValue = style({
  margin: 0,
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
  fontSize: vars.appType.hero.fontSize,
  lineHeight: vars.appType.hero.lineHeight,
  fontWeight: vars.appType.hero.fontWeight,
  color: vars.colors.text.primary,
});

export const caption = style({
  margin: 0,
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  fontWeight: vars.appType.caption.fontWeight,
  color: vars.colors.text.tertiary,
});

/** 이름 · 값 한 줄 — 글자를 키우면(160 · 200%) 값이 이름 아래로 내려간다 */
export const line = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "2px 12px",
  margin: 0,
});

export const lineLabel = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.appType.desc.fontWeight,
  color: vars.colors.text.tertiary,
});

export const lineValue = style({
  margin: 0,
  marginLeft: "auto",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});
