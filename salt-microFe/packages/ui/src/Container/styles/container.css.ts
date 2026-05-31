import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const containerStyles = recipe({
  base: {
    width: "100%",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: vars.space.lg,
    paddingRight: vars.space.lg,
  },

  variants: {
    // 최대 너비
    size: {
      sm: {
        maxWidth: "640px",
      },
      md: {
        maxWidth: "768px",
      },
      lg: {
        maxWidth: "1024px",
      },
      xl: {
        maxWidth: "1280px",
      },
      "2xl": {
        maxWidth: "1536px",
      },
      full: {
        maxWidth: "100%",
      },
    },

    // 패딩
    padding: {
      none: {
        paddingLeft: vars.space.none,
        paddingRight: vars.space.none,
      },
      sm: {
        paddingLeft: vars.space.sm,
        paddingRight: vars.space.sm,
      },
      md: {
        paddingLeft: vars.space.md,
        paddingRight: vars.space.md,
      },
      lg: {
        paddingLeft: vars.space.lg,
        paddingRight: vars.space.lg,
      },
      xl: {
        paddingLeft: vars.space.xl,
        paddingRight: vars.space.xl,
      },
    },

    // 중앙 정렬 여부
    centered: {
      true: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      },
      false: {},
    },
  },

  defaultVariants: {
    size: "xl",
    padding: "lg",
    centered: false,
  },
});
