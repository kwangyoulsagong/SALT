import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const gridStyles = recipe({
  base: {
    display: "grid",
  },

  variants: {
    columns: {
      1: {
        gridTemplateColumns: "repeat(1, 1fr)",
      },
      2: {
        gridTemplateColumns: "repeat(2, 1fr)",
      },
      3: {
        gridTemplateColumns: "repeat(3, 1fr)",
      },
      4: {
        gridTemplateColumns: "repeat(4, 1fr)",
      },
      5: {
        gridTemplateColumns: "repeat(5, 1fr)",
      },
      6: {
        gridTemplateColumns: "repeat(6, 1fr)",
      },
      12: {
        gridTemplateColumns: "repeat(12, 1fr)",
      },
    },

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
    },

    rowGap: {
      none: {
        rowGap: vars.space.none,
      },
      xs: {
        rowGap: vars.space.xs,
      },
      sm: {
        rowGap: vars.space.sm,
      },
      md: {
        rowGap: vars.space.md,
      },
      lg: {
        rowGap: vars.space.lg,
      },
      xl: {
        rowGap: vars.space.xl,
      },
      "2xl": {
        rowGap: vars.space["2xl"],
      },
    },

    columnGap: {
      none: {
        columnGap: vars.space.none,
      },
      xs: {
        columnGap: vars.space.xs,
      },
      sm: {
        columnGap: vars.space.sm,
      },
      md: {
        columnGap: vars.space.md,
      },
      lg: {
        columnGap: vars.space.lg,
      },
      xl: {
        columnGap: vars.space.xl,
      },
      "2xl": {
        columnGap: vars.space["2xl"],
      },
    },

    fullWidth: {
      true: {
        width: "100%",
      },
      false: {},
    },
  },

  defaultVariants: {
    columns: 3,
    gap: "md",
    fullWidth: false,
  },
});

export const responsiveGridStyles = recipe({
  base: {
    display: "grid",
  },

  variants: {
    minWidth: {
      xs: {
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      },
      sm: {
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      },
      md: {
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      },
      lg: {
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      },
      xl: {
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
      },
    },

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
    },
  },

  defaultVariants: {
    minWidth: "md",
    gap: "md",
  },
});
