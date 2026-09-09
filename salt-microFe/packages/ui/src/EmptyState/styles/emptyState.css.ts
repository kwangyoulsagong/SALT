import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const emptyStateStyles = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space.md,
  width: "100%",
  padding: `${vars.space["3xl"]} ${vars.space.lg2}`,
  fontFamily: vars.fontFamily.base,
  textAlign: "center",
});

export const iconStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    borderRadius: vars.radius.full,
  },

  variants: {
    tone: {
      empty: {
        background: vars.colors.neutral[100],
        color: vars.colors.neutral[500],
      },
      success: {
        background: vars.colors.status.successLight,
        color: vars.colors.status.successDark,
      },
      error: {
        background: vars.colors.status.errorLight,
        color: vars.colors.status.errorDark,
      },
    },
  },

  defaultVariants: {
    tone: "empty",
  },
});

export const titleStyles = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.bold,
  wordBreak: "keep-all",
});

export const descriptionStyles = style({
  margin: 0,
  maxWidth: "320px",
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  wordBreak: "keep-all",
});

export const actionStyles = style({
  marginTop: vars.space.xs,
});
