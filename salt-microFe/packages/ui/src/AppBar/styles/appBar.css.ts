import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const appBarStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.sm,
    width: "100%",
    height: "56px",
    padding: `0 ${vars.space.md}`,
    background: vars.colors.background.white,
    fontFamily: vars.fontFamily.base,
  },

  variants: {
    sticky: {
      true: {
        position: "sticky",
        top: 0,
        zIndex: vars.zIndices.sticky,
      },
      false: {},
    },

    bordered: {
      true: {
        boxShadow: `inset 0 -1px 0 ${vars.colors.border.light}`,
      },
      false: {},
    },
  },

  defaultVariants: {
    sticky: false,
    bordered: true,
  },
});

export const leadingSlotStyles = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  paddingLeft: vars.space.xs,
});

export const titleStyles = style({
  flex: 1,
  minWidth: 0,
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.bold,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const actionsStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  flexShrink: 0,
  marginLeft: "auto",
});
