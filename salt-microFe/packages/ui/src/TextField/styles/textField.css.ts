import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  width: "100%",
  fontFamily: vars.fontFamily.base,
});

export const labelStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const fieldStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.sm,
    width: "100%",
    background: vars.colors.background.white,
    transition: vars.transitions.fast,

    selectors: {
      "&:focus-within": {
        borderColor: vars.colors.border.focus,
      },
    },
  },

  variants: {
    variant: {
      box: {
        minHeight: "52px",
        padding: `0 ${vars.space.lg}`,
        border: `1px solid ${vars.colors.border.light}`,
        borderRadius: vars.radius.button.md,
      },
      line: {
        minHeight: "48px",
        padding: `0 ${vars.space.xs}`,
        border: "none",
        borderBottom: `1.5px solid ${vars.colors.border.light}`,
        borderRadius: vars.radius.none,
      },

      /** 금액 입력. 밑줄만 두고 숫자를 크게 보여준다. */
      big: {
        minHeight: "60px",
        padding: `0 ${vars.space.xs}`,
        border: "none",
        borderBottom: `2px solid ${vars.colors.border.light}`,
        borderRadius: vars.radius.none,
      },

      /** 주문 화면처럼 화면 전체가 입력 하나일 때. 테두리 없음. */
      hero: {
        minHeight: "72px",
        padding: 0,
        border: "none",
        borderRadius: vars.radius.none,
      },
    },

    invalid: {
      true: {
        borderColor: vars.colors.status.errorDark,

        selectors: {
          "&:focus-within": {
            borderColor: vars.colors.status.errorDark,
          },
        },
      },
      false: {},
    },

    disabled: {
      true: {
        background: vars.colors.neutral[50],
        opacity: 0.7,
      },
      false: {},
    },
  },

  defaultVariants: {
    variant: "box",
    invalid: false,
    disabled: false,
  },
});

export const inputSizeStyles = recipe({
  base: {},

  variants: {
    variant: {
      box: {},
      line: {},
      big: {
        fontSize: vars.typography.t3.fontSize,
        lineHeight: vars.typography.t3.lineHeight,
        fontWeight: vars.fontWeights.bold,
        fontVariantNumeric: vars.numeric.tabular,
      },
      hero: {
        fontSize: vars.typography.t1.fontSize,
        lineHeight: vars.typography.t1.lineHeight,
        fontWeight: vars.fontWeights.bold,
        letterSpacing: vars.letterSpacings.tightest,
        fontVariantNumeric: vars.numeric.tabular,
      },
    },
  },

  defaultVariants: {
    variant: "box",
  },
});

export const inputStyles = style({
  flex: 1,
  minWidth: 0,
  width: "100%",
  padding: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,

  "::placeholder": {
    color: vars.colors.text.disabled,
  },

  selectors: {
    "&:disabled": {
      cursor: "not-allowed",
    },
  },
});

export const affixStyles = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  color: vars.colors.text.tertiary,
});

export const messageStyles = recipe({
  base: {
    margin: 0,
    fontSize: vars.typography.t7.fontSize,
    lineHeight: vars.typography.t7.lineHeight,
  },

  variants: {
    tone: {
      help: { color: vars.colors.text.tertiary },
      error: { color: vars.colors.status.errorDark },
    },
  },

  defaultVariants: {
    tone: "help",
  },
});
