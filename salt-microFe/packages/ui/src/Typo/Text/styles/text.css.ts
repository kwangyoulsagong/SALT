import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../../styles/tokens.css";

export const textVariant = recipe({
  base: {
    margin: 0,
    padding: 0,
    fontFamily: vars.fontFamily.base,
    lineHeight: 1.5,
  },

  variants: {
    // 크기/굵기 스타일
    variant: {
      body: {
        fontSize: vars.fontSizes.sm,
        fontWeight: vars.fontWeights.medium,
      },
      bodyLarge: {
        fontSize: vars.fontSizes.base,
        fontWeight: vars.fontWeights.medium,
      },
      caption: {
        fontSize: vars.fontSizes.xs,
        fontWeight: vars.fontWeights.bold,
      },
    },

    // 색상 (독립적으로 조절 가능)
    color: {
      primary: {
        color: vars.colors.text.primary,
      },
      secondary: {
        color: vars.colors.text.secondary,
      },
      tertiary: {
        color: vars.colors.text.tertiary,
      },
      // 2026-11-18 text.disabled(#B0B8C1, 흰 위 2:1) → text.tertiary — 글자는 읽혀야 한다(`FE-REQ-047` FR-13). 비활성은 disabled 를 직접
      muted: {
        color: vars.colors.text.tertiary,
      },
      /** 흰 면 위 작은 보조 글자 — tertiary 보다 한 단계 진하다(4.62:1, AA). FE-REQ-044 */
      subtle: {
        color: vars.colors.text.lightGray,
      },
      brand: {
        color: vars.colors.brand.primary,
      },
      white: {
        color: vars.colors.text.base,
      },
      success: {
        color: vars.colors.status.success,
      },
      up: {
        color: vars.colors.special.up,
      },
      down: {
        color: vars.colors.special.down,
      },
    },
  },

  defaultVariants: {
    variant: "body",
    color: "primary",
  },
});
