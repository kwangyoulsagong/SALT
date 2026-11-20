import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 휴대폰 종목 상세(`FE-REQ-072` FR-3) — 한 열 · 글자 `appType` 만. 등락 색은 기존 토큰 그대로(`screen-mobile.md` §2) */
export const priceRow = style({ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 8px", minWidth: 0 });

/** 가격 = 주인공 숫자 `t1` 30 — 잘리지 않고 줄바꿈 */
export const price = style({
  fontSize: vars.appType.hero.fontSize,
  lineHeight: vars.appType.hero.lineHeight,
  fontWeight: vars.appType.hero.fontWeight,
  fontVariantNumeric: "tabular-nums",
  overflowWrap: "anywhere",
  color: vars.colors.text.primary,
});

export const change = style({
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});
export const up = style({ color: vars.colors.special.up });
export const down = style({ color: vars.colors.special.down });
export const flat = style({ color: vars.colors.text.tertiary });

/** 한 장 패널 자리 — 흰 카드 한 장(Figma 홈 카드: 모서리 20 · 안쪽 20) */
export const panel = style({ minWidth: 0, padding: "20px", borderRadius: "20px", background: vars.colors.background.white });

export const note = style({
  margin: 0,
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
});
