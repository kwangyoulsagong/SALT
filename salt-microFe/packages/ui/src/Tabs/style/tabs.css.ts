import { recipe } from "@vanilla-extract/recipes";
import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";
import { PRESS_SELECTOR, PRESS_TRANSITION, pressActive, pressReducedMotion } from "../../styles/press";

/**
 * 섹션 탭(`FE-REQ-047` FR-4 · `screen-desktop.md` §3 실측) — 글자 진하기로만 가른다: 14/600, 선택 = 1단 · 나머지 = 2단(바탕 위 4.5 이상).
 * 밑줄 · 바닥 선 없음. 전에는 18px 제목 글자 + 3px 검은 밑줄(FE-REQ-044 P-31 미끄러지는 밑줄)이었다
 */
export const tabsContainerStyles = style({
  display: "flex",
  alignItems: "center",
  width: "100%",
  position: "relative",
});

export const tabStyles = recipe({
  base: {
    height: "36px",
    padding: `0 ${vars.space.md}`,
    background: "transparent",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    position: "relative",
    fontFamily: "inherit",
    fontSize: vars.deskType.section.fontSize,
    lineHeight: vars.deskType.section.lineHeight,
    fontWeight: vars.deskType.section.fontWeight,
    transition: `color ${vars.motion.duration.instant}, ${PRESS_TRANSITION}`,
    whiteSpace: "nowrap",
    ...pressReducedMotion,

    selectors: {
      [PRESS_SELECTOR]: pressActive,
      "&:hover": {
        color: vars.colors.desk.text1,
      },
      "&:focus": {
        outline: "none",
      },
      "&:focus-visible": {
        outline: `2px solid ${vars.colors.border.focus}`,
        outlineOffset: "-2px",
      },
    },
  },

  variants: {
    active: {
      true: { color: vars.colors.desk.text1 },
      false: { color: vars.colors.desk.text2 },
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
  gap: vars.space.xs,
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
