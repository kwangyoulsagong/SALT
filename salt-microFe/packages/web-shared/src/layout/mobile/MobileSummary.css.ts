import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 휴대폰 요약(`screen-mobile.md` §1 · §3) — 주인공 숫자 하나(`appType.hero` 30) + 그 아래 줄(이름 · 값).
 * 금액은 잘리지 않고 줄바꿈(글자 160 · 200% — `FE-REQ-072` FR-5)
 */
export const summary = style({ display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: "4px 0 8px" });

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
