import { recipe } from "@vanilla-extract/recipes";
import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const tabsContainerStyles = style({
  display: "flex",
  alignItems: "center",
  borderBottom: `1px solid ${vars.colors.border.light}`,
  width: "100%",
  position: "relative",
});

export const tabStyles = recipe({
  base: {
    padding: `${vars.space.md} ${vars.space.lg}`,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: vars.transitions.base,
    whiteSpace: "nowrap",

    selectors: {
      "&:hover": {
        color: vars.colors.brand.primary,
      },
      "&:focus": {
        outline: "none",
      },
      "&:focus-visible": {
        outline: `2px solid ${vars.colors.border.focus}`,
        outlineOffset: "-2px",
        borderRadius: vars.radius.small,
      },
    },
  },

  variants: {
    active: {
      true: {
        color: vars.colors.text.primary,
        fontWeight: vars.fontWeights.semibold,

        "::after": {
          content: '""',
          position: "absolute",
          bottom: "-1px",
          left: 0,
          right: 0,
          height: "3px",
          background: vars.colors.border.black,
          transition: vars.transitions.base,
        },
      },
      false: {
        color: vars.colors.text.tertiary,
        fontWeight: vars.fontWeights.regular,

        "::after": {
          content: '""',
          position: "absolute",
          bottom: "-1px",
          left: "50%",
          right: "50%",
          height: "2px",
          background: "transparent",
          transition: vars.transitions.base,
        },

        selectors: {
          "&:hover::after": {
            left: 0,
            right: 0,
            background: vars.colors.border.lightDark,
          },
        },
      },
    },

    disabled: {
      true: {
        color: vars.colors.text.disabled,
        cursor: "not-allowed",
        opacity: 0.5,

        selectors: {
          "&:hover": {
            color: vars.colors.text.disabled,
          },
        },
      },
      false: {},
    },
  },

  defaultVariants: {
    active: false,
    disabled: false,
  },
});

const fadeIn = keyframes({
  from: {
    opacity: 0,
    transform: "translateY(-10px)",
  },
  to: {
    opacity: 1,
    transform: "translateY(0)",
  },
});

export const tabPanelStyles = style({
  width: "100%",
  padding: vars.space.lg,

  // keyframes를 animation 속성에서 사용
  animation: `${fadeIn} 0.2s ease-in-out`,
});

export const tabListStyles = style({
  display: "flex",
  gap: vars.space.lg,
  margin: 0,
  padding: 0,
  listStyle: "none",
  overflow: "auto",
  scrollbarWidth: "none",

  selectors: {
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
});
