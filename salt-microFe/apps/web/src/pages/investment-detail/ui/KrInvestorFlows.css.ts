import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const heading = style({
  margin: 0,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

/** 흰 카드 위 보조 글자 — tertiary(3.03)는 axe 미달이라 lightGray(4.6) */
export const caption = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.lightGray,
});

/** 좁은 화면에서 표가 카드를 넘치면 표만 가로로 민다(페이지는 밀지 않는다) */
export const scroller = style({
  overflowX: "auto",
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const th = style({
  padding: "6px 8px",
  textAlign: "right",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.text.lightGray,
  borderBottom: `1px solid ${vars.colors.border.light}`,
  selectors: { "&:first-child": { textAlign: "left" } },
});

export const td = style({
  padding: "6px 8px",
  textAlign: "right",
  borderBottom: `1px solid ${vars.colors.border.light}`,
  selectors: { "&:first-child": { textAlign: "left", color: vars.colors.text.secondary } },
});

/** 합계 줄 — 굵게, 표 맨 위(최근 거래일 위) */
export const totalRow = style({
  fontWeight: vars.fontWeights.semibold,
  backgroundColor: vars.colors.background.secondary,
});

/**
 * 순매수 부호 + 색. 색만으로 방향을 말하지 않는다 — 부호를 같이 쓴다. 새 요소라 13px 에서 4.5 이상인 `upDark` · `downDark`
 * (기본 `up` 3.6 · `down` 4.3 은 axe 미달, 2026-10-26 실측 — 기존 등락 칸 색은 정해 둔 값이라 그대로 둔다)
 */
export const net = styleVariants({
  up: { color: vars.colors.special.upDark },
  down: { color: vars.colors.special.downDark },
  flat: { color: vars.colors.text.secondary },
});
