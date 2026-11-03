import { vars } from "../ui/tokens.css";
import { globalStyle, style } from "@vanilla-extract/css";

import { EMBED_APP, EMBED_ATTRIBUTE } from "@repo/core/embed";

export const Container = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100vh",
  background: vars.colors.background.primary,
});

/**
 * 앱 웹뷰는 네이티브 탭 · 머리가 따로 있다(`RN-REQ-032` FR-2 · FR-3) — 웹 내비게이션을 통째로 숨긴다.
 * 조각은 `@repo/ui/app-navigation` 이 단 `data-app-navigation` 으로 찾는다.
 */
globalStyle(`html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] [data-app-navigation]`, { display: "none" });
// 하단 탭이 숨으면 그 자리 여백도 없앤다 — 웹뷰 태블릿(768~1023)에서 56px 빈 줄이 남았다(2026-11-03 실측)
globalStyle(`html[${EMBED_ATTRIBUTE}="${EMBED_APP}"] [data-app-navigation-column]`, { paddingBottom: 0 });
