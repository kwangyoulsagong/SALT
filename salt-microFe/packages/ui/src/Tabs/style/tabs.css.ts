import { recipe } from "@vanilla-extract/recipes";
import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";
import { PRESS_SELECTOR, PRESS_TRANSITION, pressActive, pressReducedMotion } from "../../styles/press";

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
    transition: `color ${vars.transitions.base}, ${PRESS_TRANSITION}`,
    whiteSpace: "nowrap",
    ...pressReducedMotion,

    selectors: {
      [PRESS_SELECTOR]: pressActive,
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
  position: "relative",
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

/**
 * 미끄러지는 밑줄 (FE-REQ-044 P-31) — 탭마다의 `::after` 대신 하나가 옮겨 간다.
 * 측정 전(서버 HTML)에는 탭 자신의 `::after` 가 보이고, 측정 뒤에는 그것을 숨긴다.
 */
export const tabIndicatorStyles = recipe({
  base: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: "3px",
    background: vars.colors.border.black,
    pointerEvents: "none",
  },
  variants: {
    animated: {
      true: {
        transition: `transform ${vars.motion.duration.base} ${vars.motion.easing.move}`,
        "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
      },
      false: {},
    },
  },
});

globalStyle(`${tabListStyles}[data-sliding="true"] [role="tab"]::after`, {
  visibility: "hidden",
});
