import { recipe } from "@vanilla-extract/recipes";
import { globalStyle, keyframes, style } from "@vanilla-extract/css";
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
    /**
     * `pill` — 종목 상세 알약 탭(`FE-REQ-049` FR-2 · `screen-desktop.md` §3 실측): 모서리 999 · 8×12 · 14/600, 선택 = 옅은 면.
     * 섹션 탭과 글자 · 높이(36)가 같아 두 탭이 한 화면에 있어도 위계가 갈리지 않는다
     */
    variant: {
      section: {},
      pill: { padding: "8px 12px", borderRadius: "999px" },
    },
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

  compoundVariants: [{ variants: { variant: "pill", active: true }, style: { background: vars.colors.desk.line } }],

  defaultVariants: {
    variant: "section",
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

/* ── 알약 탭 선택 면 미끄러짐(`FE-REQ-049`) — 세그먼트 손잡이와 같은 방식(`useSlidingIndicator`) ─────────── */

export const pillSliding = style({ position: "relative" });

/** 선택 면 하나가 `transform` 으로 옮겨 간다. 폭은 즉시(레이아웃 속성은 움직이지 않는다) */
export const pillThumb = recipe({
  base: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: "999px",
    background: vars.colors.desk.line,
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

globalStyle(`${pillSliding}[data-sliding="true"] [role="tab"]`, { position: "relative", zIndex: 1 });
/** 손잡이가 있으면 탭 자신의 선택 면은 끈다 — 첫 측정 전(서버 HTML · 수화)에는 탭 면이 보인다 */
globalStyle(`${pillSliding}[data-sliding="true"] [role="tab"][aria-selected="true"]`, { background: "transparent" });
