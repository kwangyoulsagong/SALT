import { recipe } from "@vanilla-extract/recipes";
import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const filterContainer = style({
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  overflowX: "auto",

  // 전체 배경
  background: vars.colors.background.gray,
  padding: "2px 2px",
  borderRadius: vars.radius.base,
});

export const tabButton = recipe({
  base: {
    padding: "5px 9px",
    borderRadius: vars.radius.base,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: vars.fontSizes["md"],
    fontWeight: vars.fontWeights.medium,
    color: vars.colors.text.lightGray,
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",

    selectors: {
      "&:hover": {
        color: vars.colors.text.primary,
      },
    },
  },

  variants: {
    active: {
      true: {
        background: vars.colors.background.white,
        color: vars.colors.text.primary,
        fontWeight: vars.fontWeights.medium,
      },
      false: {},
    },
  },
});
