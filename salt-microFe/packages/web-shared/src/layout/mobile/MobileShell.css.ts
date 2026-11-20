import { globalStyle, style } from "@vanilla-extract/css";

import { SURFACE_ATTRIBUTE, SURFACE_MOBILE } from "@repo/core/mobile";
import { vars } from "@repo/ui/tokens";

/**
 * 휴대폰 틀(`FE-REQ-071` FR-5) — 한 열 · `100dvh`(주소창이 접혀도 높이가 맞는다) · 노치 · 홈 표시줄 안전 영역 ·
 * 당겨 새로고침 끔(iOS 는 남을 수 있다 — WebKit 275947). 글자는 `appType` 만(`fontSizeBudget.test.ts`).
 */
export const TAB_BAR_HEIGHT = "56px";

export const frame = style({
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  // 탭 화면 바탕 = 회색(grey100) 위 흰 카드 — 사용자 Figma "홈"(390, `FE-REQ-072` 2026-11-20). 탭 줄은 흰색 그대로
  background: vars.colors.neutral[100],
  color: vars.colors.text.primary,
  overscrollBehaviorY: "none",
  paddingTop: "env(safe-area-inset-top, 0px)",
  paddingLeft: "env(safe-area-inset-left, 0px)",
  paddingRight: "env(safe-area-inset-right, 0px)",
});

export const content = style({
  flex: 1,
  // 하단 탭 + 홈 표시줄만큼 비운다 — 마지막 행이 탭 아래로 숨지 않게
  paddingBottom: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
});

export const tabBar = style({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: vars.zIndices.fixed,
  display: "flex",
  background: vars.colors.background.white,
  boxShadow: `inset 0 1px 0 ${vars.colors.neutral[200]}`,
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  paddingLeft: "env(safe-area-inset-left, 0px)",
  paddingRight: "env(safe-area-inset-right, 0px)",
});

export const tab = style({
  flex: 1,
  minWidth: 0,
  height: TAB_BAR_HEIGHT,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2px",
  textDecoration: "none",
  color: vars.colors.neutral[600],
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  fontWeight: vars.fontWeights.medium,
  WebkitTapHighlightColor: "transparent",
  selectors: {
    '&[aria-current="page"]': { color: vars.colors.text.primary, fontWeight: vars.fontWeights.bold },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-4px" },
  },
});

export const tabIcon = style({
  color: vars.colors.neutral[400],
  selectors: { [`${tab}[aria-current="page"] &`]: { color: vars.colors.text.primary } },
});

/** 데스크톱 화면으로 보기 — 글자 링크, 누름 칸 44 이상 */
export const desktopLink = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "44px",
  marginTop: vars.space.md,
  color: vars.colors.neutral[700],
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
});

/** 로그인 — 탭 없는 한 장. 폼은 셸 `/` 와 같은 `SignInForm` */
export const loginScreen = style({
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: vars.space.lg,
  padding: `calc(${vars.space.xl} + env(safe-area-inset-top, 0px)) ${vars.space.xl} calc(${vars.space.xl} + env(safe-area-inset-bottom, 0px))`,
  background: vars.colors.background.white,
  color: vars.colors.text.primary,
});

export const loginTitle = style({
  margin: 0,
  fontSize: vars.appType.title.fontSize,
  lineHeight: vars.appType.title.lineHeight,
  fontWeight: vars.appType.title.fontWeight,
});

export const loginHint = style({
  margin: 0,
  color: vars.colors.neutral[700],
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
});

/**
 * 공용 컴포넌트의 휴대폰 누름 칸 44(`FE-REQ-072` FR-5, 옛 웹뷰 `AppShell.css` 에서) — 세그먼트(`@repo/ui` SegmentedControl, 디자인 시스템은 표면을 모른다).
 * 시트는 `<body>` 아래 포털이라 틀 클래스가 아니라 `/m` 문서 표지(`<html data-surface="mobile">`)로 건다
 */
globalStyle(`html[${SURFACE_ATTRIBUTE}="${SURFACE_MOBILE}"] [role="radiogroup"] > [role="radio"]`, { minHeight: "44px", minWidth: "44px" });
/**
 * 디자인 시스템의 작은 단을 `/m` 에서만 키운다(`FE-REQ-072` FR-5 실측 — 글자 13 이상 · 누름 44). 디자인 시스템은 표면을 모르고
 * 크기 표지(`data-badge` · `data-button-size` · `data-text` · `data-disclosure-item`)만 단다. 데스크톱 값은 그대로
 */
const PHONE = `html[${SURFACE_ATTRIBUTE}="${SURFACE_MOBILE}"]`;
globalStyle(`${PHONE} [data-badge="sm"]`, { height: "auto", minHeight: "20px", fontSize: vars.appType.caption.fontSize, lineHeight: "18px" });
globalStyle(`${PHONE} [data-button-size]`, { minHeight: "44px" });
globalStyle(`${PHONE} :is([data-text="body"], [data-disclosure-item])`, { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight });

/** 시트 안 입력도 16 이상(iOS 확대 금지) — 공용 입력 컴포넌트의 데스크톱 글자를 `/m` 에서만 */
globalStyle(`html[${SURFACE_ATTRIBUTE}="${SURFACE_MOBILE}"] :is(input, select, textarea)`, { fontSize: vars.appType.body.fontSize });

/** 입력 16px 이상 — iOS 가 포커스 때 확대하지 않게(확대 금지 메타는 쓰지 않는다, `FE-REQ-071` FR-5) */
export const loginForm = style({});
globalStyle(`${loginForm} input`, { fontSize: vars.appType.body.fontSize });
