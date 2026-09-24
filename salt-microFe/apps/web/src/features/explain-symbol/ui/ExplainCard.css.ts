import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
});

export const cardHeader = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.sm,
});

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
});

export const list = style({
  margin: 0,
  paddingLeft: vars.space.lg,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  color: vars.colors.text.secondary,
  fontSize: vars.fontSizes.base,
  lineHeight: 1.5,
});

export const note = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: vars.fontSizes.sm,
  lineHeight: 1.5,
});

/* ── 스트림 (FEATURE-008 FR-60~64) — 움직임은 transform · opacity 만, 줄인 모션이면 멈춘다 ── */

const still = { "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } } } as const;
const fadeUp = keyframes({ from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } });
const pulse = keyframes({ "0%, 100%": { transform: "scale(1)", opacity: 1 }, "50%": { transform: "scale(0.6)", opacity: 0.5 } });
const blink = keyframes({ "0%, 49%": { opacity: 1 }, "50%, 100%": { opacity: 0 } });
const pop = keyframes({ from: { transform: "scale(0.4)" }, to: { transform: "scale(1)" } });

export const steps = style({
  margin: 0,
  padding: vars.space.md,
  listStyle: "none",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: `${vars.space.xs} ${vars.space.md}`,
  borderRadius: vars.radius.medium,
  background: vars.colors.background.secondary,
});

const stepBase = {
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  fontSize: vars.fontSizes.sm,
  lineHeight: 1.5,
  transition: "color 200ms ease",
} as const;

export const step = styleVariants({
  pending: { ...stepBase, color: vars.colors.text.lightGray },
  active: { ...stepBase, color: vars.colors.text.primary, fontWeight: vars.fontWeights.semibold },
  done: { ...stepBase, color: vars.colors.text.secondary },
  skipped: { ...stepBase, color: vars.colors.text.lightGray },
});

const iconBase = {
  flex: "none",
  width: "16px",
  height: "16px",
  borderRadius: vars.radius.full,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  fontWeight: vars.fontWeights.bold,
  lineHeight: 1,
} as const;

export const stepIcon = styleVariants({
  pending: { ...iconBase, border: `1.5px solid ${vars.colors.border.default}` },
  /** 진행 중 — 숨 쉬는 점. 로딩 표시라 줄인 모션에서도 멈추지 않고 느려진다(`performance-frontend.md` §8) */
  active: {
    ...iconBase,
    background: vars.colors.text.primary,
    transform: "scale(0.6)",
    animation: `${pulse} 1s ease-in-out infinite`,
    "@media": { "(prefers-reduced-motion: reduce)": { animationDuration: "2.4s" } },
  },
  done: {
    ...iconBase,
    ...still,
    background: vars.colors.text.primary,
    color: vars.colors.background.white,
    animation: `${pop} 220ms cubic-bezier(0.3, 1.4, 0.5, 1) both`,
  },
  skipped: { ...iconBase, color: vars.colors.text.lightGray, border: `1.5px solid ${vars.colors.border.light}` },
});

export const stepHint = style({ color: vars.colors.text.lightGray, fontSize: vars.typography.t8.fontSize });

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});

export const body = style({ display: "flex", flexDirection: "column", gap: vars.space.xs });

/** 검사를 통과한 AI 문장으로 바뀐 본문 — 새로 마운트돼 한 번 떠오른다 */
export const bodyReplaced = style([body, { ...still, animation: `${fadeUp} 360ms ease both` }]);

export const block = style({ ...still, animation: `${fadeUp} 200ms ease both` });
export const blockFirst = style([block, { display: "flex", flexDirection: "column", gap: vars.space.xs, marginTop: vars.space.sm }]);

export const paragraph = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.fontSizes.base,
  lineHeight: 1.6,
});

export const bullet = style({
  margin: 0,
  paddingLeft: vars.space.lg,
  position: "relative",
  color: vars.colors.text.secondary,
  fontSize: vars.fontSizes.base,
  lineHeight: 1.5,
  selectors: {
    "&::before": {
      content: "\"\"",
      position: "absolute",
      left: "6px",
      top: "0.65em",
      width: "4px",
      height: "4px",
      borderRadius: vars.radius.full,
      background: vars.colors.text.lightGray,
    },
  },
});

/** 커서 — 드러나는 중인 줄 끝. 깜빡임은 장식이라 줄인 모션에서는 멈춘다 */
export const caret = style({
  ...still,
  display: "inline-block",
  width: "2px",
  height: "1em",
  marginLeft: "2px",
  verticalAlign: "-0.15em",
  background: vars.colors.text.primary,
  animation: `${blink} 1s steps(1) infinite`,
});

export const chips = style({
  margin: `${vars.space.xs} 0 0`,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  gap: vars.space.xs,
});

export const chip = style({
  ...still,
  padding: `2px ${vars.space.sm}`,
  borderRadius: vars.radius.full,
  background: vars.colors.background.tertiary,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  fontWeight: vars.fontWeights.semibold,
  animation: `${fadeUp} 240ms ease both`,
});

export const flash = style([note, { ...still, animation: `${fadeUp} 300ms ease both` }]);
