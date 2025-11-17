import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css.ts";

export const paddingStyles = recipe({
  base: {},

  variants: {
    // 전체 패딩
    padding: {
      none: {
        padding: vars.space.none,
      },
      xs: {
        padding: vars.space.xs,
      },
      sm: {
        padding: vars.space.sm,
      },
      md: {
        padding: vars.space.md,
      },
      lg: {
        padding: vars.space.lg,
      },
      xl: {
        padding: vars.space.xl,
      },
      "2xl": {
        padding: vars.space["2xl"],
      },
      "3xl": {
        padding: vars.space["3xl"],
      },
      "4xl": {
        padding: vars.space["4xl"],
      },
    },

    // 좌우 패딩
    paddingX: {
      none: {
        paddingLeft: vars.space.none,
        paddingRight: vars.space.none,
      },
      xs: {
        paddingLeft: vars.space.xs,
        paddingRight: vars.space.xs,
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
      "2xl": {
        paddingLeft: vars.space["2xl"],
        paddingRight: vars.space["2xl"],
      },
      "3xl": {
        paddingLeft: vars.space["3xl"],
        paddingRight: vars.space["3xl"],
      },
      "4xl": {
        paddingLeft: vars.space["4xl"],
        paddingRight: vars.space["4xl"],
      },
    },

    // 상하 패딩
    paddingY: {
      none: {
        paddingTop: vars.space.none,
        paddingBottom: vars.space.none,
      },
      xs: {
        paddingTop: vars.space.xs,
        paddingBottom: vars.space.xs,
      },
      sm: {
        paddingTop: vars.space.sm,
        paddingBottom: vars.space.sm,
      },
      md: {
        paddingTop: vars.space.md,
        paddingBottom: vars.space.md,
      },
      lg: {
        paddingTop: vars.space.lg,
        paddingBottom: vars.space.lg,
      },
      xl: {
        paddingTop: vars.space.xl,
        paddingBottom: vars.space.xl,
      },
      "2xl": {
        paddingTop: vars.space["2xl"],
        paddingBottom: vars.space["2xl"],
      },
      "3xl": {
        paddingTop: vars.space["3xl"],
        paddingBottom: vars.space["3xl"],
      },
      "4xl": {
        paddingTop: vars.space["4xl"],
        paddingBottom: vars.space["4xl"],
      },
    },

    // 상단 패딩
    paddingTop: {
      none: {
        paddingTop: vars.space.none,
      },
      xs: {
        paddingTop: vars.space.xs,
      },
      sm: {
        paddingTop: vars.space.sm,
      },
      md: {
        paddingTop: vars.space.md,
      },
      lg: {
        paddingTop: vars.space.lg,
      },
      xl: {
        paddingTop: vars.space.xl,
      },
      "2xl": {
        paddingTop: vars.space["2xl"],
      },
      "3xl": {
        paddingTop: vars.space["3xl"],
      },
      "4xl": {
        paddingTop: vars.space["4xl"],
      },
    },

    // 하단 패딩
    paddingBottom: {
      none: {
        paddingBottom: vars.space.none,
      },
      xs: {
        paddingBottom: vars.space.xs,
      },
      sm: {
        paddingBottom: vars.space.sm,
      },
      md: {
        paddingBottom: vars.space.md,
      },
      lg: {
        paddingBottom: vars.space.lg,
      },
      xl: {
        paddingBottom: vars.space.xl,
      },
      "2xl": {
        paddingBottom: vars.space["2xl"],
      },
      "3xl": {
        paddingBottom: vars.space["3xl"],
      },
      "4xl": {
        paddingBottom: vars.space["4xl"],
      },
    },

    // 좌측 패딩
    paddingLeft: {
      none: {
        paddingLeft: vars.space.none,
      },
      xs: {
        paddingLeft: vars.space.xs,
      },
      sm: {
        paddingLeft: vars.space.sm,
      },
      md: {
        paddingLeft: vars.space.md,
      },
      lg: {
        paddingLeft: vars.space.lg,
      },
      xl: {
        paddingLeft: vars.space.xl,
      },
      "2xl": {
        paddingLeft: vars.space["2xl"],
      },
      "3xl": {
        paddingLeft: vars.space["3xl"],
      },
      "4xl": {
        paddingLeft: vars.space["4xl"],
      },
    },

    // 우측 패딩
    paddingRight: {
      none: {
        paddingRight: vars.space.none,
      },
      xs: {
        paddingRight: vars.space.xs,
      },
      sm: {
        paddingRight: vars.space.sm,
      },
      md: {
        paddingRight: vars.space.md,
      },
      lg: {
        paddingRight: vars.space.lg,
      },
      xl: {
        paddingRight: vars.space.xl,
      },
      "2xl": {
        paddingRight: vars.space["2xl"],
      },
      "3xl": {
        paddingRight: vars.space["3xl"],
      },
      "4xl": {
        paddingRight: vars.space["4xl"],
      },
    },
  },
});
