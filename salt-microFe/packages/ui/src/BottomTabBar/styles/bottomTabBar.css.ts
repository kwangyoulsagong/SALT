import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const barStyles = recipe({
  base: {
    display: "flex",
    width: "100%",
    background: vars.colors.background.white,
    boxShadow: `inset 0 1px 0 ${vars.colors.border.light}`,
    // 홈 인디케이터가 있는 기기에서 마지막 탭이 가려지지 않게 한다.
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    fontFamily: vars.fontFamily.base,
  },

  variants: {
    fixed: {
      true: {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: vars.zIndices.fixed,
      },
      false: {},
    },
  },

  defaultVariants: {
    fixed: false,
  },
});

export const tabStyles = recipe({
  base: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    flex: 1,
    minWidth: 0,
    height: "56px",
    padding: `0 ${vars.space.xs}`,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: vars.typography.t8.fontSize,
    lineHeight: vars.typography.t8.lineHeight,
  },

  variants: {
    active: {
      true: {
        color: vars.colors.brand.primary,
        fontWeight: vars.fontWeights.bold,
      },
      false: {
        color: vars.colors.text.tertiary,
        fontWeight: vars.fontWeights.medium,
      },
    },
  },

  defaultVariants: {
    active: false,
  },
});

export const labelStyles = style({
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const badgeSlotStyles = style({
  position: "absolute",
  top: "6px",
  left: "50%",
  marginLeft: "4px",
});
