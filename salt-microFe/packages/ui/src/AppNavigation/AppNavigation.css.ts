import { globalStyle, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

import { vars } from "../styles/tokens.css";

/**
 * 폭에 따라 하나만 보인다 — CSS 로만 가른다(서버는 폭을 모른다, `ssr.md`).
 * 도메인 이동: 1024 이상 = 왼쪽 레일, 768~1023 = 하단 탭(`FE-REQ-054` · 2026-11-10 `FE-REQ-069` 레일 복원 — ~~머리 글자 내비 `FE-REQ-067`~~).
 * 머리 메뉴 자리는 zone 의 메뉴(투자 zone 만 — 768 이상). 768 미만은 앱이 안내 한 장을 보인다(`FE-REQ-043`) — 거기서는 아무것도 없다.
 */
const DESKTOP = "screen and (min-width: 1024px)";
const TABLET = "screen and (min-width: 768px) and (max-width: 1023px)";
const NARROW = "screen and (max-width: 767px)";
const FROM_TABLET = "screen and (min-width: 768px)";

const RAIL_WIDTH = "72px";

/**
 * 레일 칸 값 — 기준 증권 웹의 아이콘 레일 실측(2026-11-03, 1440 폭 계산 스타일). 출처 이름은 적지 않는다(`screen-desktop.md`).
 * 칸 42×58 · 아이콘 판 32 · 모서리 8 · 아이콘 16 · 라벨 12/500(색은 대비 때문에 실측 3단 대신 회색 700 — 아래). 미선택 아이콘 = `text.disabled`(#B0B8C1, 같은 값),
 * 선택 = 옅은 판 + 0.75px 안쪽 선 + 진한 아이콘. 하단 탭(768~1023)이 같은 값을 이어 쓴다. 글자색 3단 토큰은 `FE-REQ-047` FR-3 이 `@repo/tokens` 로 올린다.
 * 2026-11-09 머리 글자 내비로 바꿨다가(`FE-REQ-067`) 2026-11-10 되돌렸다(`FE-REQ-069` — 사용자 "헤더바 좌측은 유지")
 */
const RAIL_ITEM = { width: "56px", height: "58px" } as const;
const TILE_SIZE = "32px";
const TILE_ACTIVE_BG = "rgba(7, 25, 76, 0.04)";
const TILE_ACTIVE_RING = "inset 0 0 0 0.75px rgba(13, 25, 74, 0.02)";
const ICON_ACTIVE = "rgba(24, 31, 43, 0.77)";
/**
 * 라벨 색 — 기준 화면 실측값(`rgba(18,31,51,.47)`)은 회색 바탕(`background.primary`) 위 12px 글자 대비 2.92:1 로 AA(4.5) 미달이었다
 * (2026-11-03 axe). 접근성이 우선이라 회색 700(`neutral.700`, 6.45:1)으로 — 선택 표시는 판 · 아이콘 색이 맡는다.
 */
const LABEL_COLOR = vars.colors.neutral[700];
const BOTTOM_TAB_HEIGHT = "56px";
/** 머리 메뉴 링크 미선택 — 2단(`screen-desktop.md` §2 — 바탕 위 4.5:1 이상) */
const HEADER_IDLE = "rgba(22, 31, 46, 0.64)";

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
  // 768 미만은 본문 · 내비가 다 숨고 앱이 안내 한 장을 그린다 — 틀이 화면 높이를 잡으면 안내가 빈 화면 아래로 밀린다(2026-11-03 실측 390: 안내 top 844)
  "@media": { [NARROW]: { minHeight: 0 } },
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

/** 내비 없는 화면(로그인 · 온보딩) — 하단 탭이 없으니 그 자리 여백도 없다 */
export const columnBare = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
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

/**
 * 머리 52 — 투명(바탕 위), 왼쪽 로고 자리 · 오른쪽 계정(`screen-desktop.md` §1 실측).
 *
 * `viewTransitionName` 은 쌓임 맥락을 만든다 — 그 안의 계정 메뉴(`zIndex: dropdown`)가 머리 밖으로 못 나가 아래 본문 카드에
 * 깔렸다(로그아웃을 누를 수 없었다, 2026-11-05 `FE-REQ-013` 확인 중 발견). 그래서 머리 자체를 본문 위에 둔다 — 하단 탭과 같은 규칙
 */
export const header = style({
  position: "relative",
  zIndex: vars.zIndices.sticky,
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

/**
 * 머리 메뉴 줄 — zone 의 메뉴(투자: 코인 · 주식 · 포트폴리오 · 리포트 · 코치 설정, `FE-REQ-069`). 링크 값은 참고 국내 증권 웹 실측(2026-11-09 `FE-REQ-067`):
 * 높이 36 · 패딩 8×12 · 모서리 9 · 14/600/20 · 선택은 글자 진하기로만(1단 ↔ 2단 .64) · 면 없음. 하단 탭(768~1023)은 도메인이라 메뉴는 768 이상 늘 보인다
 */
export const headerNav = style({
  display: "none",
  "@media": { [FROM_TABLET]: { display: "flex", alignItems: "center", gap: "2px", marginLeft: vars.space.lg } },
});

/** 검색칸 자리 — 폭은 칸 컴포넌트가 정한다(실측 200 × 32) */
export const headerSearch = style({ display: "flex", alignItems: "center", marginRight: vars.space.sm });

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
      header: {
        flexDirection: "row",
        height: "36px",
        padding: `${vars.space.sm} ${vars.space.md}`,
        borderRadius: "9px",
        fontSize: vars.fontSizes.base,
        lineHeight: "20px",
        fontWeight: vars.fontWeights.semibold,
        color: HEADER_IDLE,
        selectors: { "&:hover": { background: TILE_ACTIVE_BG } },
      },
      bottom: { flex: 1, minWidth: 0, height: BOTTOM_TAB_HEIGHT },
    },
    state: {
      idle: { cursor: "pointer" },
      active: {},
      // 첫 화면이 아직 없는 탭 — 보이되 눌리지 않는다. 색만으로 가르지 않게 화면 리더 문구 · 툴팁을 같이 둔다
      disabled: { cursor: "default", opacity: 0.5 },
    },
  },
  defaultVariants: { placement: "header", state: "idle" },
  compoundVariants: [{ variants: { placement: "header", state: "active" }, style: { color: vars.colors.text.primary } }],
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

// 아이콘 크기 — 레일 16(실측) · 하단 탭 20(누름 영역이 넓고 라벨과 한 줄이 아니라 한 단 크게). 머리 메뉴는 글자만이라 아이콘이 없다
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
