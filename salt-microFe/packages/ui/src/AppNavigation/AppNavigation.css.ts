import { globalStyle, style } from "@vanilla-extract/css";
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

/**
 * 레일 칸 값 — 기준 증권 웹의 아이콘 레일 실측(2026-11-03, 1440 폭 계산 스타일). 출처 이름은 적지 않는다(`screen-desktop.md`).
 * 칸 42×58 · 아이콘 판 32 · 모서리 8 · 아이콘 16 · 라벨 12/500 3단 색. 미선택 아이콘 = `text.disabled`(#B0B8C1, 같은 값),
 * 선택 = 옅은 판 + 0.75px 안쪽 선 + 진한 아이콘. 글자색 3단 토큰은 `FE-REQ-047` FR-3 이 `@repo/tokens` 로 올린다 — 그때 바꾼다.
 */
const RAIL_ITEM = { width: "56px", height: "58px" } as const;
const TILE_SIZE = "32px";
const TILE_ACTIVE_BG = "rgba(7, 25, 76, 0.04)";
const TILE_ACTIVE_RING = "inset 0 0 0 0.75px rgba(13, 25, 74, 0.02)";
const ICON_ACTIVE = "rgba(24, 31, 43, 0.77)";
const LABEL_COLOR = "rgba(18, 31, 51, 0.47)";
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
      gap: 0,
      flexShrink: 0,
      width: RAIL_WIDTH,
      height: "100vh",
      paddingTop: vars.space.md,
      // 바탕 위 투명 레일 + 0.75px 선(실측)
      boxShadow: `inset -0.75px 0 0 ${vars.colors.border.light}`,
      background: "transparent",
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

/** 칸 — 판(`tile`) 위아래 상태를 이 클래스로 찾는다 */
export const itemHook = style({});

export const item = recipe({
  base: [
    itemHook,
    {
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
      color: LABEL_COLOR,
      selectors: {
        "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px", borderRadius: "8px" },
      },
    },
  ],
  variants: {
    placement: {
      rail: RAIL_ITEM,
      bottom: { flex: 1, minWidth: 0, height: BOTTOM_TAB_HEIGHT },
    },
    state: {
      idle: { cursor: "pointer" },
      active: {},
      // 첫 화면이 아직 없는 탭 — 보이되 눌리지 않는다. 색만으로 가르지 않게 화면 리더 문구 · 툴팁을 같이 둔다
      disabled: { cursor: "default", opacity: 0.5 },
    },
  },
  defaultVariants: { placement: "rail", state: "idle" },
});

/** 아이콘 판 32 · 모서리 8 — 선택 · 호버 때만 면이 생긴다 */
export const tile = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: TILE_SIZE,
  height: TILE_SIZE,
  borderRadius: "8px",
  color: vars.colors.text.disabled,
  transition: `background-color ${vars.motion.duration.instant} ${vars.motion.easing.enter}`,
  selectors: {
    [`${itemHook}[aria-current="page"] &`]: { background: TILE_ACTIVE_BG, boxShadow: TILE_ACTIVE_RING, color: ICON_ACTIVE },
    [`${itemHook}:not([aria-current]):not([aria-disabled]):hover &`]: { background: TILE_ACTIVE_BG },
  },
});

// 아이콘 크기 — 레일 16(실측) · 하단 탭 20(누름 영역이 넓고 라벨과 한 줄이 아니라 한 단 크게)
globalStyle(`${tile} svg`, { width: "16px", height: "16px" });
globalStyle(`${bottom} ${tile} svg`, { width: "20px", height: "20px" });

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
