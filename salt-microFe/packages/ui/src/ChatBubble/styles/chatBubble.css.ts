import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

const blink = keyframes({
  "0%, 60%, 100%": { opacity: 0.25 },
  "30%": { opacity: 1 },
});

export const rowStyles = recipe({
  base: {
    display: "flex",
    gap: vars.space.sm,
    width: "100%",
    fontFamily: vars.fontFamily.base,
  },

  variants: {
    role: {
      user: { justifyContent: "flex-end" },
      assistant: { justifyContent: "flex-start" },
    },
  },

  defaultVariants: {
    role: "assistant",
  },
});

export const avatarStyles = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "28px",
  height: "28px",
  marginTop: "2px",
  borderRadius: vars.radius.full,
  background: vars.colors.ai.lighter,
  color: vars.colors.neutral[800],
});

export const columnStyles = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: vars.space.xs,
    minWidth: 0,
    maxWidth: "min(85%, 520px)",
  },

  variants: {
    role: {
      user: { alignItems: "flex-end" },
      assistant: { alignItems: "flex-start" },
    },
  },

  defaultVariants: {
    role: "assistant",
  },
});

export const bubbleStyles = recipe({
  base: {
    padding: `${vars.space.md} ${vars.space.lg}`,
    fontSize: vars.typography.t6.fontSize,
    lineHeight: vars.typography.t6.lineHeight,
    wordBreak: "keep-all",
    overflowWrap: "anywhere",
  },

  variants: {
    role: {
      user: {
        borderRadius: `${vars.radius.large} ${vars.radius.small} ${vars.radius.large} ${vars.radius.large}`,
        background: vars.colors.brand.primary,
        color: vars.colors.text.white,
      },
      assistant: {
        borderRadius: `${vars.radius.small} ${vars.radius.large} ${vars.radius.large} ${vars.radius.large}`,
        background: vars.colors.neutral[100],
        color: vars.colors.neutral[800],
      },
    },
  },

  defaultVariants: {
    role: "assistant",
  },
});

export const metaStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
});

export const footerStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  flexWrap: "wrap",
});

export const typingStyles = style({
  display: "inline-flex",
  gap: "4px",
  alignItems: "center",
  height: vars.typography.t6.lineHeight,
});

export const dotStyles = style({
  width: "6px",
  height: "6px",
  borderRadius: vars.radius.full,
  background: vars.colors.neutral[500],
  animation: `${blink} 1.2s ease-in-out infinite`,

  selectors: {
    "&:nth-child(2)": { animationDelay: "0.2s" },
    "&:nth-child(3)": { animationDelay: "0.4s" },
  },

  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
      opacity: 0.6,
    },
  },
});
