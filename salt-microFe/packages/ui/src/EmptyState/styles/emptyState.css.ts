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
    frame: {
      badge: {},
      none: {},
    },
  },

  compoundVariants: [
    {
      variants: { frame: "none" },
      style: { width: "auto", height: "auto", borderRadius: 0, background: "none" },
    },
  ],

  defaultVariants: {
    tone: "empty",
    frame: "badge",
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

/**
 * 설명 글자색 — 2단 `rgba(22,31,46,.64)`(`screen-desktop.md` §2 · `FE-REQ-047` FR-13: 흰 4.99 · 회색 바탕 4.81:1).
 * 전의 `text.tertiary`(#8B95A1)는 흰 위 3.03 · 회색 위 2.75:1 로 13px 기준(4.5) 미달이었다(2026-11-18 axe — 알림 빈 상태, 사용자 결정으로 공용 값 변경).
 * `text.tertiary` 토큰 자체(31 파일)는 FR-13 몫으로 남긴다
 */
export const descriptionStyles = style({
  margin: 0,
  maxWidth: "320px",
  color: "rgba(22, 31, 46, 0.64)",
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  wordBreak: "keep-all",
});

export const actionStyles = style({
  marginTop: vars.space.xs,
});
