import { globalStyle, style } from "@vanilla-extract/css";

import { SURFACE_ATTRIBUTE, SURFACE_MOBILE } from "@repo/core/mobile";
import { vars } from "@repo/ui/tokens";

/**
 * 휴대폰 틀(`FE-REQ-071` FR-5) — 한 열 · `100dvh`(주소창이 접혀도 높이가 맞는다) · 노치 · 홈 표시줄 안전 영역 ·
 * 당겨 새로고침 끔(iOS 는 남을 수 있다 — WebKit 275947). 글자는 `appType` 만(`fontSizeBudget.test.ts`).
 */
export const TAB_BAR_HEIGHT = "64px";
/** 떠 있는 탭과 화면 아래 끝 사이(안전 영역 위) */
export const TAB_BAR_GAP = "12px";
/** 탭이 차지하는 아래 공간 전체 — 본문 끝 비우기 · 하단 고정 버튼 위치가 같이 쓴다 */
export const TAB_BAR_SPACE = `calc(${TAB_BAR_HEIGHT} + ${TAB_BAR_GAP} + env(safe-area-inset-bottom, 0px))`;

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
  // 떠 있는 탭 + 홈 표시줄만큼 비운다 — 마지막 카드가 탭 아래로 숨지 않게
  paddingBottom: `calc(${TAB_BAR_SPACE} + 8px)`,
});

/**
 * 하단 탭 — 화면 위에 떠 있는 글래스 알약(사용자 "카드랑 저런 아이콘 그리고 글래스 느낌", 2026-11-20 `FE-REQ-072`).
 * 반투명 흰 면 + 뒤 흐림 · 옅은 테두리 · 부드러운 그림자(떠 있는 요소만 그림자). 흐림을 못 하는 브라우저는 거의 불투명 흰 면
 */
export const tabBar = style({
  position: "fixed",
  left: `calc(16px + env(safe-area-inset-left, 0px))`,
  right: `calc(16px + env(safe-area-inset-right, 0px))`,
  bottom: `calc(${TAB_BAR_GAP} + env(safe-area-inset-bottom, 0px))`,
  zIndex: vars.zIndices.fixed,
  display: "flex",
  gap: "4px",
  height: TAB_BAR_HEIGHT,
  padding: "6px",
  boxSizing: "border-box",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.94)",
  border: "1px solid rgba(255, 255, 255, 0.7)",
  boxShadow: "0 8px 28px rgba(2, 32, 71, 0.12), inset 0 0 0 0.5px rgba(2, 32, 71, 0.06)",
  "@supports": {
    "(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))": {
      background: "rgba(255, 255, 255, 0.66)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
    },
  },
});

/** 탭 칸 — 고른 칸은 옅은 회색 알약(높이 52 — 누름 칸 44 이상) */
export const tab = style({
  flex: 1,
  minWidth: 0,
  height: "100%",
  borderRadius: "999px",
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
    '&[aria-current="page"]': { color: vars.colors.text.primary, fontWeight: vars.fontWeights.bold, background: "rgba(2, 32, 71, 0.06)" },
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
