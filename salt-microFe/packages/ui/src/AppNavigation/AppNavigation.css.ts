import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "../styles/tokens.css";

/**
 * 폭에 따라 하나만 보인다 — CSS 로만 가른다(서버는 폭을 모른다, `ssr.md`).
 * 1024 이상 = 왼쪽 레일, 768~1023 = 하단 탭. 768 미만은 앱이 안내 한 장을 보인다(`FE-REQ-043`) — 거기서는 아무것도 없다.
 */
const DESKTOP = "screen and (min-width: 1024px)";
const TABLET = "screen and (min-width: 768px) and (max-width: 1023px)";
const NARROW = "screen and (max-width: 767px)";

const RAIL_WIDTH = "72px";
const BOTTOM_TAB_HEIGHT = "56px";

/** 문서 간 전환에서 제자리에 남는 조각 — 같은 이름이 zone 마다 같아야 크롬이 움직이지 않는다(`FE-REQ-054` FR-4) */
export const VIEW_TRANSITION_NAMES = {
  rail: "app-navigation-rail",
  bottom: "app-navigation-bottom",
  header: "app-navigation-header",
} as const;

export const frame = style({
  display: "flex",
  width: "100%",
  minHeight: "100vh",
});

export const column = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
  "@media": {
    // 하단 탭이 본문 끝을 덮지 않게
    [TABLET]: { paddingBottom: `calc(${BOTTOM_TAB_HEIGHT} + env(safe-area-inset-bottom, 0px))` },
  },
});

export const rail = style({
  display: "none",
  "@media": {
    [DESKTOP]: {
      position: "sticky",
      top: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: vars.space.xs,
      flexShrink: 0,
      width: RAIL_WIDTH,
      height: "100vh",
      paddingTop: vars.space.md,
      boxShadow: `inset -1px 0 0 ${vars.colors.border.light}`,
      background: vars.colors.background.white,
      zIndex: vars.zIndices.sticky,
      viewTransitionName: VIEW_TRANSITION_NAMES.rail,
    },
  },
});

export const bottom = style({
  display: "none",
  "@media": {
    [TABLET]: {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      boxShadow: `inset 0 1px 0 ${vars.colors.border.light}`,
      background: vars.colors.background.white,
      zIndex: vars.zIndices.fixed,
      viewTransitionName: VIEW_TRANSITION_NAMES.bottom,
    },
  },
});

/** 머리 52 — 투명(바탕 위), 왼쪽 로고 자리 · 오른쪽 계정(`screen-desktop.md` §1 실측) */
export const header = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flexShrink: 0,
  height: "52px",
  padding: `0 ${vars.space.lg}`,
  viewTransitionName: VIEW_TRANSITION_NAMES.header,
  "@media": { [NARROW]: { display: "none" } },
});

export const headerSpacer = style({ flex: 1 });

export const content = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
});

export const item = recipe({
  base: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    border: "none",
    background: "transparent",
    textDecoration: "none",
    fontFamily: vars.fontFamily.base,
    // 라벨 12/500 — `screen-desktop.md` §2 라벨 단
    fontSize: "12px",
    lineHeight: "16px",
    fontWeight: vars.fontWeights.medium,
    color: vars.colors.text.tertiary,
    transition: `background-color ${vars.motion.duration.instant} ${vars.motion.easing.enter}`,
    selectors: {
      "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
    },
  },
  variants: {
    placement: {
      rail: { width: "56px", height: "56px", borderRadius: "9px" },
      bottom: { flex: 1, minWidth: 0, height: BOTTOM_TAB_HEIGHT },
    },
    state: {
      idle: {
        cursor: "pointer",
        selectors: { "&:hover": { background: vars.colors.background.tertiary } },
      },
      active: {
        color: vars.colors.text.primary,
        fontWeight: vars.fontWeights.bold,
      },
      // 첫 화면이 아직 없는 탭 — 보이되 눌리지 않는다
      disabled: { color: vars.colors.text.disabled, cursor: "default" },
    },
  },
  compoundVariants: [
    { variants: { placement: "rail", state: "active" }, style: { background: vars.colors.background.tertiary } },
  ],
  defaultVariants: { placement: "rail", state: "idle" },
});

export const icon = style({
  display: "inline-flex",
  width: "20px",
  height: "20px",
});

export const label = style({
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});
