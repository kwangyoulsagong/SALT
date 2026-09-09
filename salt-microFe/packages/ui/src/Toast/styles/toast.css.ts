import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

const slideIn = keyframes({
  from: { opacity: 0, transform: "translateY(8px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

export const viewportStyles = style({
  position: "fixed",
  left: "50%",
  bottom: `calc(${vars.space.xl} + env(safe-area-inset-bottom, 0px))`,
  transform: "translateX(-50%)",
  zIndex: vars.zIndices.tooltip,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  width: "min(420px, calc(100vw - 32px))",
  // 비어 있을 때 아래 화면 클릭을 막지 않는다.
  pointerEvents: "none",
});

export const toastStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.md,
    width: "100%",
    padding: `${vars.space.md} ${vars.space.lg}`,
    borderRadius: vars.radius.medium,
    boxShadow: vars.elevation.md,
    fontFamily: vars.fontFamily.base,
    fontSize: vars.typography.t6.fontSize,
    lineHeight: vars.typography.t6.lineHeight,
    pointerEvents: "auto",
    animation: `${slideIn} ${vars.transitions.base}`,

    "@media": {
      "(prefers-reduced-motion: reduce)": {
        animation: "none",
      },
    },
  },

  variants: {
    tone: {
      neutral: {
        background: vars.colors.neutral[800],
        color: vars.colors.text.white,
      },
      success: {
        background: vars.colors.status.successLight,
        color: vars.colors.status.successDark,
      },
      error: {
        background: vars.colors.status.errorLight,
        color: vars.colors.status.errorDark,
      },
      warning: {
        background: vars.colors.status.warningLight,
        color: vars.colors.status.warningDark,
      },
      info: {
        background: vars.colors.status.infoLight,
        color: vars.colors.status.infoDark,
      },
    },
  },

  defaultVariants: {
    tone: "neutral",
  },
});

export const messageStyles = style({
  flex: 1,
  minWidth: 0,
  wordBreak: "keep-all",
});

export const actionStyles = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
});
