import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const marginStyles = recipe({
  base: {
    display: "block",
    width: "100%",
  },

  variants: {
    // 상단 마진
    top: {
      none: { marginTop: vars.space.none },
      xs: { marginTop: vars.space.xs },
      sm: { marginTop: vars.space.sm },
      md: { marginTop: vars.space.md },
      lg: { marginTop: vars.space.lg },
      xl: { marginTop: vars.space.xl },
      "2xl": { marginTop: vars.space["2xl"] },
      "3xl": { marginTop: vars.space["3xl"] },
      "4xl": { marginTop: vars.space["4xl"] },
      "5xl": { marginTop: vars.space["5xl"] },
      "6xl": { marginTop: vars.space["6xl"] },
    },

    // 우측 마진
    right: {
      none: { marginRight: vars.space.none },
      xs: { marginRight: vars.space.xs },
      sm: { marginRight: vars.space.sm },
      md: { marginRight: vars.space.md },
      lg: { marginRight: vars.space.lg },
      xl: { marginRight: vars.space.xl },
      "2xl": { marginRight: vars.space["2xl"] },
      "3xl": { marginRight: vars.space["3xl"] },
      "4xl": { marginRight: vars.space["4xl"] },
      "5xl": { marginRight: vars.space["5xl"] },
      "6xl": { marginRight: vars.space["6xl"] },
    },

    // 하단 마진
    bottom: {
      none: { marginBottom: vars.space.none },
      xs: { marginBottom: vars.space.xs },
      sm: { marginBottom: vars.space.sm },
      md: { marginBottom: vars.space.md },
      lg: { marginBottom: vars.space.lg },
      xl: { marginBottom: vars.space.xl },
      "2xl": { marginBottom: vars.space["2xl"] },
      "3xl": { marginBottom: vars.space["3xl"] },
      "4xl": { marginBottom: vars.space["4xl"] },
      "5xl": { marginBottom: vars.space["5xl"] },
      "6xl": { marginBottom: vars.space["6xl"] },
    },

    // 좌측 마진
    left: {
      none: { marginLeft: vars.space.none },
      xs: { marginLeft: vars.space.xs },
      sm: { marginLeft: vars.space.sm },
      md: { marginLeft: vars.space.md },
      lg: { marginLeft: vars.space.lg },
      xl: { marginLeft: vars.space.xl },
      "2xl": { marginLeft: vars.space["2xl"] },
      "3xl": { marginLeft: vars.space["3xl"] },
      "4xl": { marginLeft: vars.space["4xl"] },
      "5xl": { marginLeft: vars.space["5xl"] },
      "6xl": { marginLeft: vars.space["6xl"] },
    },

    // 가로 마진 (좌우)
    horizontal: {
      none: {
        marginLeft: vars.space.none,
        marginRight: vars.space.none,
      },
      xs: {
        marginLeft: vars.space.xs,
        marginRight: vars.space.xs,
      },
      sm: {
        marginLeft: vars.space.sm,
        marginRight: vars.space.sm,
      },
      md: {
        marginLeft: vars.space.md,
        marginRight: vars.space.md,
      },
      lg: {
        marginLeft: vars.space.lg,
        marginRight: vars.space.lg,
      },
      xl: {
        marginLeft: vars.space.xl,
        marginRight: vars.space.xl,
      },
      "2xl": {
        marginLeft: vars.space["2xl"],
        marginRight: vars.space["2xl"],
      },
      "3xl": {
        marginLeft: vars.space["3xl"],
        marginRight: vars.space["3xl"],
      },
      "4xl": {
        marginLeft: vars.space["4xl"],
        marginRight: vars.space["4xl"],
      },
      "5xl": {
        marginLeft: vars.space["5xl"],
        marginRight: vars.space["5xl"],
      },
      "6xl": {
        marginLeft: vars.space["6xl"],
        marginRight: vars.space["6xl"],
      },
      auto: {
        marginLeft: "auto",
        marginRight: "auto",
      },
    },

    // 세로 마진 (상하)
    vertical: {
      none: {
        marginTop: vars.space.none,
        marginBottom: vars.space.none,
      },
      xs: {
        marginTop: vars.space.xs,
        marginBottom: vars.space.xs,
      },
      sm: {
        marginTop: vars.space.sm,
        marginBottom: vars.space.sm,
      },
      md: {
        marginTop: vars.space.md,
        marginBottom: vars.space.md,
      },
      lg: {
        marginTop: vars.space.lg,
        marginBottom: vars.space.lg,
      },
      xl: {
        marginTop: vars.space.xl,
        marginBottom: vars.space.xl,
      },
      "2xl": {
        marginTop: vars.space["2xl"],
        marginBottom: vars.space["2xl"],
      },
      "3xl": {
        marginTop: vars.space["3xl"],
        marginBottom: vars.space["3xl"],
      },
      "4xl": {
        marginTop: vars.space["4xl"],
        marginBottom: vars.space["4xl"],
      },
      "5xl": {
        marginTop: vars.space["5xl"],
        marginBottom: vars.space["5xl"],
      },
      "6xl": {
        marginTop: vars.space["6xl"],
        marginBottom: vars.space["6xl"],
      },
    },

    // 전체 마진
    all: {
      none: { margin: vars.space.none },
      xs: { margin: vars.space.xs },
      sm: { margin: vars.space.sm },
      md: { margin: vars.space.md },
      lg: { margin: vars.space.lg },
      xl: { margin: vars.space.xl },
      "2xl": { margin: vars.space["2xl"] },
      "3xl": { margin: vars.space["3xl"] },
      "4xl": { margin: vars.space["4xl"] },
      "5xl": { margin: vars.space["5xl"] },
      "6xl": { margin: vars.space["6xl"] },
      auto: { margin: "auto" },
    },

    // 인라인 요소로 변경
    inline: {
      true: { display: "inline-block" },
      false: {},
    },
  },

  defaultVariants: {
    inline: false,
  },
});
