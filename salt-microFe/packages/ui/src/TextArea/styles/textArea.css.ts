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

export const headerStyles = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const labelStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const counterStyles = recipe({
  base: {
    fontSize: vars.typography.t8.fontSize,
    lineHeight: vars.typography.t8.lineHeight,
    fontVariantNumeric: vars.numeric.tabular,
  },

  variants: {
    over: {
      true: { color: vars.colors.status.errorDark },
      false: { color: vars.colors.text.tertiary },
    },
  },

  defaultVariants: {
    over: false,
  },
});

export const fieldStyles = recipe({
  base: {
    display: "flex",
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
        padding: `${vars.space.md} ${vars.space.lg}`,
        border: `1px solid ${vars.colors.border.light}`,
        borderRadius: vars.radius.button.md,
      },
      line: {
        padding: `${vars.space.sm} ${vars.space.xs}`,
        border: "none",
        borderBottom: `1.5px solid ${vars.colors.border.light}`,
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

export const textAreaStyles = style({
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
  resize: "vertical",

  "::placeholder": {
    color: vars.colors.text.disabled,
  },

  selectors: {
    "&:disabled": {
      cursor: "not-allowed",
    },
  },
});

/** autoResize일 때는 사용자가 직접 늘리지 못하게 막는다. 높이를 코드가 관리한다. */
export const autoResizeStyles = style({
  resize: "none",
  overflowY: "hidden",
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
