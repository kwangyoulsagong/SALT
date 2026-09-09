import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const slideUp = keyframes({
  from: { transform: "translateY(100%)" },
  to: { transform: "translateY(0)" },
});

export const overlayStyles = style({
  position: "fixed",
  inset: 0,
  zIndex: vars.zIndices.modal,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  background: vars.colors.overlay.dark,
  animation: `${fadeIn} ${vars.transitions.base}`,

  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});

export const sheetStyles = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "480px",
  maxHeight: "85vh",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  borderTopLeftRadius: vars.radius.xl,
  borderTopRightRadius: vars.radius.xl,
  background: vars.colors.background.white,
  boxShadow: vars.elevation.sheet,
  fontFamily: vars.fontFamily.base,
  animation: `${slideUp} ${vars.transitions.slow}`,

  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});

export const grabberStyles = style({
  flexShrink: 0,
  width: "40px",
  height: "4px",
  margin: `${vars.space.sm} auto ${vars.space.xs}`,
  borderRadius: vars.radius.full,
  background: vars.colors.neutral[300],
});

export const titleStyles = style({
  flexShrink: 0,
  margin: 0,
  padding: `${vars.space.md} ${vars.space.lg2} ${vars.space.sm}`,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t4.fontSize,
  lineHeight: vars.typography.t4.lineHeight,
  fontWeight: vars.fontWeights.bold,
});

export const bodyStyles = style({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: `${vars.space.sm} ${vars.space.lg2} ${vars.space.xl}`,
});
