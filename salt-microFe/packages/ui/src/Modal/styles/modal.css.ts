import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const popIn = keyframes({
  from: { opacity: 0, transform: "scale(.96)" },
  to: { opacity: 1, transform: "scale(1)" },
});

export const overlayStyles = style({
  position: "fixed",
  inset: 0,
  zIndex: vars.zIndices.modal,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space.lg,
  background: vars.colors.overlay.dark,
  animation: `${fadeIn} ${vars.transitions.base}`,

  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});

export const panelStyles = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxHeight: "85vh",
    borderRadius: vars.radius.xl,
    background: vars.colors.background.white,
    boxShadow: vars.elevation.lg,
    fontFamily: vars.fontFamily.base,
    animation: `${popIn} ${vars.transitions.base}`,

    "@media": {
      "(prefers-reduced-motion: reduce)": {
        animation: "none",
      },
    },
  },

  variants: {
    size: {
      sm: { maxWidth: "320px" },
      md: { maxWidth: "480px" },
      lg: { maxWidth: "720px" },
    },
  },

  defaultVariants: {
    size: "md",
  },
});

export const headerStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flexShrink: 0,
  padding: `${vars.space.lg} ${vars.space.lg2} ${vars.space.sm}`,
});

export const titleStyles = style({
  flex: 1,
  minWidth: 0,
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t4.fontSize,
  lineHeight: vars.typography.t4.lineHeight,
  fontWeight: vars.fontWeights.bold,
});

export const bodyStyles = style({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: `0 ${vars.space.lg2} ${vars.space.lg}`,
  color: vars.colors.neutral[700],
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
});

export const footerStyles = style({
  display: "flex",
  gap: vars.space.sm,
  flexShrink: 0,
  padding: `0 ${vars.space.lg2} ${vars.space.lg2}`,
});
