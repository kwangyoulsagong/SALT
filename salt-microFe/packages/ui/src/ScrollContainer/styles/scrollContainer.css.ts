import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css.ts";
import { style } from "@vanilla-extract/css";

// 커스텀 스크롤바 스타일
export const scrollbarStyles = style({
  selectors: {
    "&::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    "&::-webkit-scrollbar-track": {
      background: vars.colors.neutral[100],
      borderRadius: vars.radius.base,
    },
    "&::-webkit-scrollbar-thumb": {
      background: vars.colors.neutral[400],
      borderRadius: vars.radius.base,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: vars.colors.neutral[500],
    },
  },
  // Firefox
  scrollbarWidth: "thin",
  scrollbarColor: `${vars.colors.neutral[400]} ${vars.colors.neutral[100]}`,
});

export const scrollContainerStyles = recipe({
  base: {
    overflow: "auto",
  },

  variants: {
    // 스크롤 방향
    direction: {
      vertical: {
        overflowY: "auto",
        overflowX: "hidden",
      },
      horizontal: {
        overflowX: "auto",
        overflowY: "hidden",
      },
      both: {
        overflow: "auto",
      },
      none: {
        overflow: "hidden",
      },
    },

    // 스크롤바 스타일
    scrollbar: {
      default: {},
      thin: {},
      hidden: {
        selectors: {
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      },
    },

    // 최대 높이
    maxHeight: {
      xs: {
        maxHeight: "200px",
      },
      sm: {
        maxHeight: "300px",
      },
      md: {
        maxHeight: "400px",
      },
      lg: {
        maxHeight: "500px",
      },
      xl: {
        maxHeight: "600px",
      },
      "2xl": {
        maxHeight: "800px",
      },
      full: {
        maxHeight: "100%",
      },
    },

    // 최대 너비
    maxWidth: {
      xs: {
        maxWidth: "200px",
      },
      sm: {
        maxWidth: "300px",
      },
      md: {
        maxWidth: "400px",
      },
      lg: {
        maxWidth: "500px",
      },
      xl: {
        maxWidth: "600px",
      },
      "2xl": {
        maxWidth: "800px",
      },
      full: {
        maxWidth: "100%",
      },
    },

    // 전체 높이
    fullHeight: {
      true: {
        height: "100%",
      },
      false: {},
    },

    // 전체 너비
    fullWidth: {
      true: {
        width: "100%",
      },
      false: {},
    },
  },

  defaultVariants: {
    direction: "both",
    scrollbar: "default",
    fullHeight: false,
    fullWidth: false,
  },
});
