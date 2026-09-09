import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const bannerStyles = recipe({
  base: {
    display: "flex",
    gap: vars.space.sm,
    width: "100%",
    padding: `${vars.space.md} ${vars.space.lg}`,
    borderRadius: vars.radius.medium,
    fontFamily: vars.fontFamily.base,
    color: vars.colors.neutral[800],
  },

  variants: {
    tone: {
      info: {
        background: vars.colors.status.infoLight,
        borderLeft: `3px solid ${vars.colors.status.infoDark}`,
      },
      warning: {
        background: vars.colors.status.warningLight,
        borderLeft: `3px solid ${vars.colors.status.warningDark}`,
      },
      error: {
        background: vars.colors.status.errorLight,
        borderLeft: `3px solid ${vars.colors.status.errorDark}`,
      },
      success: {
        background: vars.colors.status.successLight,
        borderLeft: `3px solid ${vars.colors.status.successDark}`,
      },
      neutral: {
        background: vars.colors.neutral[50],
        borderLeft: `3px solid ${vars.colors.neutral[300]}`,
      },
    },
  },

  defaultVariants: {
    tone: "info",
  },
});

export const iconStyles = style({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  height: vars.typography.t6.lineHeight,
});

export const bodyStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const titleStyles = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.bold,
});

export const descriptionStyles = style({
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.neutral[700],
  wordBreak: "keep-all",
});
