import { keyframes, style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const section = style({ display: "flex", flexDirection: "column", gap: vars.space.lg });

export const head = style({ display: "flex", alignItems: "center", gap: vars.space.sm });

export const title = style({
  margin: 0,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});

/** "방향 예측 아님" — 경고가 아니라 성격 표시라 중립 회색 */
export const badge = style({
  padding: `2px ${vars.space.sm}`,
  borderRadius: vars.radius.full,
  background: vars.colors.background.tertiary,
  color: vars.colors.text.lightGray,
  fontSize: vars.typography.t8.fontSize,
  fontWeight: vars.fontWeights.semibold,
});

export const lead = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const subHeading = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});

/* ── 범위 띠 ───────────────────────────────────────────── */

export const bandList = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: vars.space.sm });

export const bandRow = style({
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr)",
  alignItems: "center",
  gap: vars.space.sm,
});

export const bandLabel = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
});

export const track = style({ position: "relative", height: "20px" });

/**
 * 띠가 **왼쪽에서 오른쪽으로 그려지며** 나온다 — 스트리밍 느낌(FEATURE-008 FR-62). `transform` 만 쓴다
 * (레이아웃 · 페인트 없음, `performance.md`). 기간마다 늦게 시작해 순서대로 흐른다.
 */
const draw = keyframes({ from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } });
const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

const animated = {
  transformOrigin: "left center",
  animation: `${draw} 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
} as const;

export const whisker = style({
  ...animated,
  position: "absolute",
  top: "50%",
  height: "2px",
  marginTop: "-1px",
  background: vars.colors.border.default,
  borderRadius: vars.radius.full,
});

export const box = style({
  ...animated,
  position: "absolute",
  top: "3px",
  bottom: "3px",
  background: vars.colors.brand.lighter,
  borderRadius: vars.radius.small,
});

export const medianTick = style({
  position: "absolute",
  top: "1px",
  bottom: "1px",
  width: "2px",
  marginLeft: "-1px",
  background: vars.colors.brand.primary,
  borderRadius: vars.radius.full,
  animation: `${fade} 300ms ease both`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

/** 기준가 — 모든 기간에 같은 x. 점선으로 "지금"을 표시한다 */
export const baseLine = style({
  position: "absolute",
  top: "-4px",
  bottom: "-4px",
  width: 0,
  borderLeft: `1px dashed ${vars.colors.text.tertiary}`,
});

/* ── 표 ───────────────────────────────────────────────── */

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: vars.typography.t7.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
});

export const caption = style({
  captionSide: "top",
  textAlign: "left",
  paddingBottom: vars.space.xs,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
});

export const th = style({
  padding: `${vars.space.xs} 0`,
  color: vars.colors.text.tertiary,
  fontWeight: vars.fontWeights.regular,
  textAlign: "right",
  selectors: { "&:first-child": { textAlign: "left" } },
});

const fadeRow = {
  animation: `${fade} 400ms ease both`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
} as const;

export const tr = style({ ...fadeRow, borderTop: `1px solid ${vars.colors.border.light}` });

export const td = style({
  padding: `${vars.space.sm} 0`,
  textAlign: "right",
  color: vars.colors.text.primary,
  selectors: { "&:first-child": { textAlign: "left", color: vars.colors.text.lightGray } },
});

/** 손익 색 — 국내 관례(상승 빨강 · 하락 파랑). 부호 문자를 함께 쓴다(색만으로 말하지 않는다) */
export const signed = styleVariants({
  up: { color: vars.colors.special.upDark },
  down: { color: vars.colors.special.downDark },
  flat: { color: vars.colors.text.primary },
});

export const note = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
});

export const plainList = style({
  margin: 0,
  paddingLeft: vars.space.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  color: vars.colors.text.secondary,
  fontSize: vars.typography.t7.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
});
