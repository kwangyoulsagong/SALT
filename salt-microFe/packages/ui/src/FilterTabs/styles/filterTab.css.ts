import { globalStyle, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";
import { PRESS_SELECTOR, PRESS_TRANSITION, pressActive, pressReducedMotion } from "../../styles/press";

/** 칩 변형의 옅은 회색 면 — 고른 칩 · hover */
const CHIP_FILL = "rgba(7, 25, 76, 0.04)";

export const filterContainer = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    overflowX: "auto",

    /**
     * **자기 안에서 스크롤하려면 먼저 줄어들 수 있어야 한다.**
     *
     * `overflowX: auto` 만으로는 부족하다 — flex item 의 `min-width` 기본값이 `auto` 라
     * 내용 폭(버튼 7개 = 334px) 아래로 줄지 않고, 그만큼 페이지를 밀어낸다. 375px 화면에서
     * 문서가 3px 넘쳤다 (`FE-REQ-010` FR-51).
     */
    minWidth: 0,
    maxWidth: "100%",
  },
  variants: {
    variant: {
      segmented: {
        background: vars.colors.background.gray,
        padding: "2px 2px",
        borderRadius: vars.radius.base,
      },
      chip: {
        gap: "2px",
      },
    },
  },
  defaultVariants: { variant: "segmented" },
});

export const tabButton = recipe({
  base: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    transition: `color ${vars.motion.duration.instant}, background-color ${vars.motion.duration.instant}, ${PRESS_TRANSITION}`,
    whiteSpace: "nowrap",
    ...pressReducedMotion,
    selectors: {
      [PRESS_SELECTOR]: pressActive,
    },
  },

  variants: {
    variant: {
      segmented: {
        padding: "5px 9px",
        borderRadius: vars.radius.base,
        fontSize: vars.fontSizes["md"],
        fontWeight: vars.fontWeights.medium,
        color: vars.colors.text.lightGray,
        selectors: {
          "&:hover": { color: vars.colors.text.primary },
        },
      },
      chip: {
        height: "28px",
        padding: "4px 8px",
        borderRadius: "7px",
        fontSize: "13px",
        lineHeight: "20px",
        fontWeight: vars.fontWeights.semibold,
        color: vars.colors.neutral[500],
        selectors: {
          "&:hover": { background: CHIP_FILL, color: vars.colors.text.primary },
        },
      },
    },
    active: {
      true: {},
      false: {},
    },
  },

  compoundVariants: [
    {
      variants: { variant: "segmented", active: true },
      style: {
        background: vars.colors.background.white,
        color: vars.colors.text.primary,
        fontWeight: vars.fontWeights.medium,
      },
    },
    {
      variants: { variant: "chip", active: true },
      style: {
        background: CHIP_FILL,
        color: vars.colors.text.primary,
      },
    },
  ],

  defaultVariants: { variant: "segmented", active: false },
});

/**
 * `SegmentedControl` 의 흰 알약이 새 칸으로 미끄러진다 (FE-REQ-044 P-31).
 * 측정 전에는 고른 칸 자신의 흰 면이 보이고, 측정 뒤에는 그 면을 비우고 알약 하나가 옮겨 간다.
 */
export const segmentedSliding = style({
  position: "relative",
});

export const segmentedThumb = recipe({
  base: {
    position: "absolute",
    top: "2px",
    bottom: "2px",
    left: 0,
    borderRadius: vars.radius.base,
    background: vars.colors.background.white,
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

globalStyle(`${segmentedSliding}[data-sliding="true"] [role="radio"]`, {
  position: "relative",
  zIndex: 1,
});

globalStyle(`${segmentedSliding}[data-sliding="true"] [role="radio"][aria-checked="true"]`, {
  background: "transparent",
});
