import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css.ts";

export const flexBoxStyles = recipe({
  base: {
    display: "flex",
  },

  variants: {
    // 방향
    direction: {
      row: {
        flexDirection: "row",
      },
      column: {
        flexDirection: "column",
      },
      rowReverse: {
        flexDirection: "row-reverse",
      },
      columnReverse: {
        flexDirection: "column-reverse",
      },
    },

    // 주축 정렬
    justify: {
      start: {
        justifyContent: "flex-start",
      },
      center: {
        justifyContent: "center",
      },
      end: {
        justifyContent: "flex-end",
      },
      between: {
        justifyContent: "space-between",
      },
      around: {
        justifyContent: "space-around",
      },
      evenly: {
        justifyContent: "space-evenly",
      },
    },

    // 교차축 정렬
    align: {
      start: {
        alignItems: "flex-start",
      },
      center: {
        alignItems: "center",
      },
      end: {
        alignItems: "flex-end",
      },
      stretch: {
        alignItems: "stretch",
      },
      baseline: {
        alignItems: "baseline",
      },
    },

    // 간격
    gap: {
      none: {
        gap: vars.space.none,
      },
      xs: {
        gap: vars.space.xs,
      },
      sm: {
        gap: vars.space.sm,
      },
      md: {
        gap: vars.space.md,
      },
      lg: {
        gap: vars.space.lg,
      },
      xl: {
        gap: vars.space.xl,
      },
      "2xl": {
        gap: vars.space["2xl"],
      },
      "3xl": {
        gap: vars.space["3xl"],
      },
      "4xl": {
        gap: vars.space["4xl"],
      },
    },

    // 줄바꿈
    wrap: {
      nowrap: {
        flexWrap: "nowrap",
      },
      wrap: {
        flexWrap: "wrap",
      },
      wrapReverse: {
        flexWrap: "wrap-reverse",
      },
    },

    // 전체 너비/높이
    fullWidth: {
      true: {
        width: "100%",
      },
      false: {},
    },

    fullHeight: {
      true: {
        height: "100%",
      },
      false: {},
    },
  },

  defaultVariants: {
    direction: "row",
    justify: "start",
    align: "start",
    gap: "none",
    wrap: "nowrap",
    fullWidth: false,
    fullHeight: false,
  },
});
