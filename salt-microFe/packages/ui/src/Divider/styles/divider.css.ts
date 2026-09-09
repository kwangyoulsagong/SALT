import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const dividerStyles = recipe({
  base: {
    border: "none",
    margin: 0,
    flexShrink: 0,
  },

  variants: {
    orientation: {
      horizontal: { width: "100%", height: "1px" },
      vertical: { width: "1px", alignSelf: "stretch" },
    },

    tone: {
      light: { background: vars.colors.neutral[100] },
      default: { background: vars.colors.border.light },
      strong: { background: vars.colors.border.default },
    },

    /** 리스트 행 좌우 패딩만큼 안쪽으로 들여쓴다. */
    inset: {
      none: {},
      row: { marginLeft: vars.space.lg2, marginRight: vars.space.lg2 },
      leading: { marginLeft: "56px" },
    },
  },

  defaultVariants: {
    orientation: "horizontal",
    tone: "default",
    inset: "none",
  },
});
