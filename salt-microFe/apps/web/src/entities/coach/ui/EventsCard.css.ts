import { keyframes, style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 움직임은 transform · opacity 만. 줄인 모션이면 멈춘 최종 상태 */
const still = { "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } } } as const;
const unfold = keyframes({ from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } });
const fadeUp = keyframes({ from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } });
const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

export const section = style({ display: "flex", flexDirection: "column", gap: vars.space.md });
export const head = style({ display: "flex", alignItems: "center", gap: vars.space.sm });

export const title = style({
  margin: 0,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});

/** 판정이 아니라는 성격 표시라 중립 회색 */
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

export const list = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" });

export const item = style({
  ...still,
  borderTop: `1px solid ${vars.colors.border.light}`,
  animation: `${fadeUp} 320ms ease both`,
  selectors: { "&:first-child": { borderTop: 0 } },
});

export const rowButton = style({
  width: "100%",
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr) auto 12px",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `${vars.space.md} 0`,
  border: 0,
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" } },
});

export const dday = style({
  justifySelf: "start",
  padding: `2px 6px`,
  borderRadius: vars.radius.small,
  background: vars.colors.background.tertiary,
  color: vars.colors.text.secondary,
  fontSize: vars.typography.t8.fontSize,
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
});

export const eventName = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  fontWeight: vars.fontWeights.semibold,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const when = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
});

export const chevron = style({
  color: vars.colors.text.lightGray,
  fontSize: "16px",
  lineHeight: 1,
  transition: "transform 200ms ease",
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});
export const chevronOpen = style({ transform: "rotate(90deg)" });

export const detail = style({ display: "flex", flexDirection: "column", gap: vars.space.md, paddingBottom: vars.space.md });

export const picker = style({
  display: "flex",
  gap: "2px",
  padding: "3px",
  borderRadius: vars.radius.medium,
  background: vars.colors.background.tertiary,
});

export const chip = style({
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
export const chipActive = style({
  background: vars.colors.background.white,
  color: vars.colors.text.primary,
  boxShadow: `0 1px 3px ${vars.colors.shadow.md}`,
});

export const body = style({
  ...still,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  animation: `${fadeUp} 280ms ease both`,
});

export const headline = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  fontWeight: vars.fontWeights.bold,
});

export const rows = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });

export const row = style({
  display: "grid",
  gridTemplateColumns: "56px minmax(0, 1fr) 56px",
  alignItems: "center",
  gap: vars.space.sm,
});

export const rowLabel = style({ color: vars.colors.text.tertiary, fontSize: vars.typography.t8.fontSize });

export const rowValue = style({
  textAlign: "right",
  color: vars.colors.text.primary,
  fontSize: vars.typography.t8.fontSize,
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
});
export const rowValueMuted = style([rowValue, { color: vars.colors.text.tertiary, fontWeight: vars.fontWeights.medium }]);

export const track = style({ position: "relative", height: "18px" });

/** 0% 기준선 — 두 줄이 같은 축이라 같은 자리에 선다 */
export const zero = style({
  position: "absolute",
  top: "-3px",
  bottom: "-3px",
  width: 0,
  borderLeft: `1px dashed ${vars.colors.border.dark}`,
});

const barBase = {
  ...still,
  position: "absolute",
  top: "5px",
  height: "8px",
  borderRadius: vars.radius.full,
  animation: `${unfold} 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both`,
} as const;

export const outer = style({ ...barBase, background: vars.colors.text.primary, opacity: 0.16 });
export const outerMuted = style({ ...barBase, background: vars.colors.text.tertiary, opacity: 0.32, animationDelay: "120ms" });
export const inner = style({ ...barBase, background: vars.colors.text.primary, opacity: 0.4, animationDelay: "80ms" });

const midBase = {
  ...still,
  position: "absolute",
  top: "1px",
  bottom: "1px",
  width: "3px",
  marginLeft: "-1.5px",
  borderRadius: vars.radius.full,
  animation: `${fade} 200ms ease 420ms both`,
} as const;
export const mid = style({ ...midBase, background: vars.colors.text.primary });
export const midMuted = style({ ...midBase, background: vars.colors.text.tertiary });

export const facts = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  gap: `${vars.space.xs} ${vars.space.md}`,
  color: vars.colors.text.secondary,
  fontSize: vars.typography.t8.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
});

export const subHeading = style({
  margin: `0 0 ${vars.space.xs}`,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.bold,
});

export const misses = style({
  margin: 0,
  paddingLeft: vars.space.lg,
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  color: vars.colors.text.secondary,
  fontSize: vars.typography.t8.fontSize,
  fontVariantNumeric: vars.numeric.tabular,
});

export const note = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
});

export const disclaimer = style([note, { lineHeight: vars.typography.t8.lineHeight }]);

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});
