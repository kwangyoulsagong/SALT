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

/* ── 차트 머리 · 범례 · 기간 고르기 · 읽기 ─────────────────── */

export const chartHead = style({ display: "flex", alignItems: "center", minHeight: "20px" });

const blink = keyframes({ "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.3 } });

export const live = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.xs,
  color: vars.colors.text.secondary,
  fontSize: vars.typography.t8.fontSize,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
});

/** "실시간" 표시 점 — 연결이 살아 있다는 신호라 줄인 모션에서도 느리게 깜빡인다(`performance-frontend.md` §8) */
export const liveDot = style({
  width: "6px",
  height: "6px",
  borderRadius: vars.radius.full,
  background: vars.colors.special.up,
  animation: `${blink} 1600ms ease-in-out infinite`,
  "@media": { "(prefers-reduced-motion: reduce)": { animationDuration: "3200ms" } },
});

export const legend = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  gap: vars.space.md,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
});

export const legendItem = style({ display: "inline-flex", alignItems: "center", gap: "6px" });

export const swatch = style({ width: "12px", height: "8px", borderRadius: "2px", background: vars.colors.text.tertiary });
export const swatch90 = style({ opacity: 0.18 });
export const swatch50 = style({ opacity: 0.34 });
export const swatchMedian = style({ width: "12px", height: 0, borderTop: `1.5px dashed ${vars.colors.text.secondary}` });

/** 기간 칩 — 회색 바탕에 선택된 것만 흰 알약. 선택 색을 쓰지 않는다 */
export const weekPicker = style({
  display: "flex",
  gap: "2px",
  padding: "3px",
  borderRadius: vars.radius.medium,
  background: vars.colors.background.tertiary,
});

export const weekChip = style({
  flex: 1,
  padding: `${vars.space.xs} ${vars.space.sm}`,
  border: 0,
  borderRadius: vars.radius.base,
  background: "transparent",
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.semibold,
  cursor: "pointer",
  transition: "background-color 200ms ease, color 200ms ease",
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "1px" } },
});

export const weekChipActive = style({
  background: vars.colors.background.white,
  color: vars.colors.text.primary,
  boxShadow: `0 1px 3px ${vars.colors.shadow.md}`,
});

const rise = keyframes({ from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "none" } });

/** 고른 기간의 숫자 — 기간이 바뀌면 새로 마운트돼 아래에서 올라온다 */
export const readout = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  animation: `${rise} 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

export const readoutRow = style({ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: vars.space.md });

export const readoutLabel = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.medium,
});

export const readoutValue = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
  textAlign: "right",
});

export const readoutSub = style({
  margin: `${vars.space.xs} 0 0`,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
});

export const scenarioGrid = style({ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: vars.space.xs });

export const scenarioCell = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  padding: vars.space.sm,
  borderRadius: vars.radius.small,
  background: vars.colors.background.secondary,
});

export const scenarioValue = style({
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
});

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
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

const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

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
