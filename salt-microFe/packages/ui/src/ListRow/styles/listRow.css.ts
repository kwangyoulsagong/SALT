import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const listRowStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.md,
    width: "100%",
    minHeight: "56px",
    padding: `${vars.space.md} ${vars.space.lg2}`,
    border: "none",
    background: vars.colors.background.white,
    fontFamily: vars.fontFamily.base,
    textAlign: "left",
  },

  variants: {
    pressable: {
      true: {
        cursor: "pointer",
        transition: vars.transitions.fast,

        selectors: {
          "&:hover": {
            background: vars.colors.neutral[50],
          },
          "&:active": {
            background: vars.colors.neutral[100],
          },
        },
      },
      false: {},
    },

    divider: {
      true: {
        boxShadow: `inset 0 -1px 0 ${vars.colors.border.light}`,
      },
      false: {},
    },
  },

  defaultVariants: {
    pressable: false,
    divider: false,
  },
});

export const leadingStyles = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
});

export const bodyStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  flex: 1,
  minWidth: 0,
});

export const titleStyles = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.medium,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const captionStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const trailingStyles = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "2px",
  flexShrink: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
});

export const trailingBottomStyles = style({
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontWeight: vars.fontWeights.regular,
  color: vars.colors.text.tertiary,
});

export const chevronStyles = style({
  flexShrink: 0,
  color: vars.colors.neutral[400],
});
