import { vars } from "../ui/tokens.css";
import { globalStyle, style } from "@vanilla-extract/css";

import { EMBED_APP, EMBED_ATTRIBUTE } from "@repo/core/embed";
import { vars as uiVars } from "@repo/ui/tokens";

export const Container = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100vh",
  background: vars.colors.background.primary,
});

/**
 * 앱 웹뷰 바탕 = 흰 한 열(`FE-REQ-060` 모바일 표 "면" · `screen-mobile.md` §2) — 데스크톱 회색 바탕 `#F4F5F8` 을 걷는다.
 * 터치 대상 44(FR-M5) — 공용 세그먼트(`@repo/ui` SegmentedControl, 디자인 시스템은 웹뷰를 모른다) 칸을 여기서 키운다
 */
globalStyle(`html[${EMBED_ATTRIBUTE}="${EMBED_APP}"], html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] body, html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] ${Container}`, {
  // 셸 토큰(`../ui/tokens.css`)에는 흰 바탕이 없다 — 디자인 시스템 토큰에서
  background: uiVars.colors.background.white,
});
globalStyle(`html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] [role="radiogroup"] > [role="radio"]`, { minHeight: "44px", minWidth: "44px" });

/**
 * 앱 웹뷰는 네이티브 탭 · 머리가 따로 있다(앱은 2026-11-20 `ADR-012` 로 폐기 — PWA `/m` 으로 옮기며 이 분기를 지운다) — 웹 내비게이션을 통째로 숨긴다.
 * 조각은 `@repo/ui/app-navigation` 이 단 `data-app-navigation` 으로 찾는다.
 */
globalStyle(`html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] [data-app-navigation]`, { display: "none" });
// 하단 탭이 숨으면 그 자리 여백도 없앤다 — 웹뷰 태블릿(768~1023)에서 56px 빈 줄이 남았다(2026-11-03 실측)
globalStyle(`html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] [data-app-navigation-column]`, { paddingBottom: 0 });
// 본문 패널(`FE-REQ-047` FR-2)은 데스크톱 틀이다 — 앱 웹뷰는 화면 끝까지 쓰는 모바일 배치(FR-17 · `screen-mobile.md`)라 면 · 여백 · 선을 걷는다
globalStyle(`html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] [data-app-navigation-content]`, {
  margin: 0,
  borderRadius: 0,
  background: "transparent",
  boxShadow: "none",
});
