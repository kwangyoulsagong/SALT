import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

/**
 * 모바일 요약(`FE-REQ-060` 모바일 표 "요약" · `screen-mobile.md` §1 · §3) — 주인공 숫자 하나(`appType.hero` 30) + 그 아래 줄(이름 · 값).
 * 앱 웹뷰에서만 보인다 — 데스크톱은 같은 값을 `SummaryBand` 타일로. 금액은 잘리지 않고 줄바꿈(FR-M4)
 */
export const summary = style({
  display: "none",
  selectors: {
    [IN_APP_WEBVIEW]: { display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: "4px 0 8px" },
  },
});

export const hero = style({ display: "flex", flexDirection: "column", gap: "2px", margin: 0 });

export const heroLabel = style({
  margin: 0,
  selectors: {
    [IN_APP_WEBVIEW]: {
      fontSize: vars.appType.desc.fontSize,
      lineHeight: vars.appType.desc.lineHeight,
      fontWeight: vars.appType.desc.fontWeight,
      color: vars.colors.text.tertiary,
    },
  },
});

export const heroValue = style({
  margin: 0,
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
  selectors: {
    [IN_APP_WEBVIEW]: {
      fontSize: vars.appType.hero.fontSize,
      lineHeight: vars.appType.hero.lineHeight,
      fontWeight: vars.appType.hero.fontWeight,
      color: vars.colors.text.primary,
    },
  },
});

export const caption = style({
  margin: 0,
  selectors: {
    [IN_APP_WEBVIEW]: {
      fontSize: vars.appType.caption.fontSize,
      lineHeight: vars.appType.caption.lineHeight,
      fontWeight: vars.appType.caption.fontWeight,
      color: vars.colors.text.tertiary,
    },
  },
});

/** 이름 · 값 한 줄 — 글자를 키우면(160 · 200%) 값이 이름 아래로 내려간다(FR-M4) */
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
  selectors: {
    [IN_APP_WEBVIEW]: {
      fontSize: vars.appType.desc.fontSize,
      lineHeight: vars.appType.desc.lineHeight,
      fontWeight: vars.appType.desc.fontWeight,
      color: vars.colors.text.tertiary,
    },
  },
});

export const lineValue = style({
  margin: 0,
  marginLeft: "auto",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
  selectors: {
    [IN_APP_WEBVIEW]: {
      fontSize: vars.appType.desc.fontSize,
      lineHeight: vars.appType.desc.lineHeight,
      fontWeight: "600",
      color: vars.colors.text.primary,
    },
  },
});
