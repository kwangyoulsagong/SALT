import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 국내 지수 요약(F011 슬라이스 6) — 코인 요약 띠 자리에 칸 두세 개. 코인 작은 항목과 같은 글자 크기(이름 12 · 값 14)로
 * 띠가 표보다 앞에 나서지 않게 한다. 좁은 화면에선 칸이 줄을 바꾼다
 */
export const strip = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: vars.space.sm,
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  padding: "10px 12px",
  borderRadius: vars.radius.base,
  border: `1px solid ${vars.colors.border.light}`,
  backgroundColor: vars.colors.background.white,
  minWidth: 0,
});

export const nameRow = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: vars.fontSizes.sm,
  lineHeight: "16px",
  color: vars.colors.text.secondary,
});

export const valueRow = style({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  columnGap: "8px",
  fontVariantNumeric: "tabular-nums",
});

export const value = style({
  fontSize: vars.fontSizes.md,
  lineHeight: "22px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const sub = style({
  fontSize: vars.fontSizes.sm,
  lineHeight: "16px",
  // tertiary 는 axe 대비 미달 — 새 요소라 4.5 이상(장 상태 줄과 같은 값)
  color: vars.colors.neutral[700],
  fontVariantNumeric: "tabular-nums",
});

export const staleBadge = style({
  fontSize: "11px",
  lineHeight: "16px",
  padding: "0 4px",
  borderRadius: vars.radius.small,
  backgroundColor: vars.colors.neutral[100],
  color: vars.colors.neutral[700],
});

export const placeholder = styleVariants({
  card: { height: "74px" },
});

/** 지수 등락 — 새 요소라 4.5 이상인 진한 색(`KrInvestorFlows` 와 같은 판단). 부호를 같이 쓴다 */
export const indexChange = styleVariants({
  up: { color: vars.colors.special.upDark },
  down: { color: vars.colors.special.downDark },
  flat: { color: vars.colors.text.secondary },
});
