import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const containerStyles = style({
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: vars.colors.neutral[100],
  fontFamily: vars.fontFamily.base,
  // 드래그 중에 브라우저 기본 스크롤·선택이 끼어들지 않게 한다.
  touchAction: "none",
});

export const panelStyles = recipe({
  base: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: vars.radius.medium,
    background: vars.colors.background.white,
  },

  variants: {
    dragging: {
      true: { opacity: 0.5 },
      false: {},
    },
  },

  defaultVariants: {
    dragging: false,
  },
});

export const panelHeaderStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  flexShrink: 0,
  height: "36px",
  padding: `0 ${vars.space.sm} 0 ${vars.space.md}`,
  boxShadow: `inset 0 -1px 0 ${vars.colors.border.light}`,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.bold,
});

export const dragHandleStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  flex: 1,
  minWidth: 0,
  padding: 0,
  border: "none",
  background: "none",
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  cursor: "grab",

  selectors: {
    "&:active": { cursor: "grabbing" },
  },
});

export const panelTitleStyles = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const panelBodyStyles = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
});

export const splitterStyles = recipe({
  base: {
    position: "absolute",
    background: "transparent",
    border: "none",
    padding: 0,
    zIndex: 1,

    selectors: {
      "&:hover::after, &:focus-visible::after": {
        background: vars.colors.brand.primary,
      },
      "&::after": {
        content: '""',
        position: "absolute",
        borderRadius: vars.radius.full,
        background: "transparent",
        transition: `background ${vars.transitions.fast}`,
      },
    },
  },

  variants: {
    orientation: {
      row: {
        cursor: "col-resize",

        selectors: {
          "&::after": {
            top: "50%",
            left: "50%",
            width: "2px",
            height: "28px",
            transform: "translate(-50%, -50%)",
          },
        },
      },
      column: {
        cursor: "row-resize",

        selectors: {
          "&::after": {
            top: "50%",
            left: "50%",
            width: "28px",
            height: "2px",
            transform: "translate(-50%, -50%)",
          },
        },
      },
    },
  },

  defaultVariants: {
    orientation: "row",
  },
});

export const dropIndicatorStyles = style({
  position: "absolute",
  zIndex: 2,
  borderRadius: vars.radius.medium,
  background: vars.colors.brand.lighter,
  border: `2px solid ${vars.colors.brand.primary}`,
  opacity: 0.75,
  pointerEvents: "none",
});
