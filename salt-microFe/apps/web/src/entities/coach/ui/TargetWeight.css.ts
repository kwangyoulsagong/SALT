import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 목표 비중 안내(F010 슬라이스 5) — F009 카드와 같은 조밀형(`TradeRisk.css`): 본문 13px · 보조 12px · 숫자 tabular.
 * 종목 줄은 옅은 면 하나에 헤어라인으로 나눈다 — 카드 안 카드를 만들지 않는다.
 */

export const rowList = style({
  margin: 0,
  padding: "4px 14px",
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  borderRadius: "12px",
  // 옅은 면이 아니라 흰 면 + 테두리 — 종목 이름(`AssetIdentity` neutral 600)이 옅은 면 위에서 4.26:1 로 AA 미달이었다(2026-09-29 axe)
  border: `1px solid ${vars.colors.neutral[100]}`,
  background: vars.colors.background.white,
  fontFamily: vars.fontFamily.base,
});

export const row = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "12px 0",
  borderBottom: `1px solid ${vars.colors.neutral[100]}`,
  fontVariantNumeric: vars.numeric.tabular,
  selectors: { "&:last-child": { borderBottom: "none" } },
});

/** 종목(로고 · 이름) | 목표 · 지금 — 좁은 폭에선 비중이 아래로 내려간다 */
export const rowHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "6px 12px",
});

export const rowWeights = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: vars.colors.text.primary,
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
});

/** 보조 줄 — neutral 700(AA) */
export const rowLine = style({
  margin: 0,
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  overflowWrap: "anywhere",
});

export const rowGap = style([rowLine, { color: vars.colors.text.primary, fontSize: "13px", lineHeight: "20px", fontWeight: vars.fontWeights.semibold }]);

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  margin: 0,
  fontFamily: vars.fontFamily.base,
});

export const sectionTitle = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
});

export const plainList = style({
  margin: 0,
  paddingLeft: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  fontVariantNumeric: vars.numeric.tabular,
});

/** 흰 면 위 본문 줄 — 13px neutral 700 */
export const text = style({
  margin: 0,
  color: vars.colors.neutral[700],
  fontSize: "13px",
  lineHeight: "20px",
  fontVariantNumeric: vars.numeric.tabular,
  overflowWrap: "anywhere",
});

export const strongText = style([text, { color: vars.colors.text.primary, fontWeight: vars.fontWeights.semibold }]);

/** 기록 줄 두 개(이 규칙 · BTC 보유) — 옅은 면 */
export const recordBox = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(7, 25, 76, 0.04)",
});

export const disclosure = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  paddingTop: vars.space.md,
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
});

export const failureGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: vars.space.md,
});
