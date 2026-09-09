import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

/**
 * 배지는 전부 틴트 배경 + 어두운 전경이다.
 * 솔리드 배경 + 흰 글자는 작은 글자에서 WCAG AA(4.5:1)에 못 미친다.
 */
export const badgeStyles = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: vars.space.xs,
    flexShrink: 0,
    borderRadius: vars.radius.small,
    fontFamily: vars.fontFamily.base,
    fontWeight: vars.fontWeights.semibold,
    whiteSpace: "nowrap",
  },

  variants: {
    tone: {
      neutral: {
        background: vars.colors.neutral[100],
        color: vars.colors.neutral[700],
      },
      brand: {
        background: vars.colors.brand.lighter,
        color: vars.colors.brand.active,
      },
      up: {
        background: vars.colors.special.upLight,
        color: vars.colors.special.upDark,
      },
      down: {
        background: vars.colors.special.downLight,
        color: vars.colors.special.downDark,
      },
      success: {
        background: vars.colors.status.successLight,
        color: vars.colors.status.successDark,
      },
      warning: {
        background: vars.colors.status.warningLight,
        color: vars.colors.status.warningDark,
      },
      ai: {
        background: vars.colors.ai.lighter,
        color: vars.colors.neutral[800],
      },
    },

    size: {
      sm: {
        height: "20px",
        padding: `0 ${vars.space.xs}`,
        fontSize: vars.typography.t8.fontSize,
        lineHeight: vars.typography.t8.lineHeight,
      },
      md: {
        height: "24px",
        padding: `0 ${vars.space.sm}`,
        fontSize: vars.typography.t7.fontSize,
        lineHeight: vars.typography.t7.lineHeight,
      },
    },
  },

  defaultVariants: {
    tone: "neutral",
    size: "md",
  },
});
