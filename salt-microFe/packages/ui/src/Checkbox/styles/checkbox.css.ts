import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.sm,
  cursor: "pointer",
  fontFamily: vars.fontFamily.base,

  selectors: {
    "&:has(input:disabled)": {
      opacity: 0.4,
      cursor: "not-allowed",
    },
  },
});

/** 시각적으로는 숨기고 포커스와 키보드 동작은 native input에 맡긴다. */
export const nativeInputStyles = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  border: 0,
  clipPath: "inset(50%)",
  overflow: "hidden",
  whiteSpace: "nowrap",
});

export const boxStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: `1.5px solid ${vars.colors.border.default}`,
    background: vars.colors.background.white,
    color: vars.colors.text.white,
    transition: vars.transitions.fast,

    selectors: {
      // native input의 focus visible을 박스로 옮긴다. 제거하지 않는다.
      [`${nativeInputStyles}:focus-visible + &`]: {
        outline: `2px solid ${vars.colors.border.focus}`,
        outlineOffset: "2px",
      },
      [`${nativeInputStyles}:checked + &`]: {
        borderColor: vars.colors.brand.primary,
        background: vars.colors.brand.primary,
      },
      [`${nativeInputStyles}:indeterminate + &`]: {
        borderColor: vars.colors.brand.primary,
        background: vars.colors.brand.primary,
      },
    },
  },

  variants: {
    size: {
      sm: { width: "18px", height: "18px", borderRadius: vars.radius.small },
      md: { width: "22px", height: "22px", borderRadius: vars.radius.small },
    },

    round: {
      true: { borderRadius: vars.radius.full },
      false: {},
    },
  },

  defaultVariants: {
    size: "md",
    round: false,
  },
});

export const labelStyles = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
});
