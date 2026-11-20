import { globalStyle, style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" });

export const rows = style({ display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: 0, listStyle: "none" });

/** 한 줄 = 입력 · 지금 → 바꾸면 · 이동. 1024 미만은 세로로 */
export const row = style({
  display: "grid",
  gridTemplateColumns: "minmax(180px, 240px) 1fr",
  alignItems: "end",
  gap: "12px",
  "@media": { "screen and (max-width: 1023px)": { gridTemplateColumns: "1fr" } },
});

export const result = style({ display: "flex", flexDirection: "column", gap: "2px", paddingBottom: "8px" });

export const value = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

// 앱 웹뷰 글자 13 이상(`ADR-012` 로 PWA `/m` 에 옮김 · `FE-REQ-060` FR-M)
export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary, selectors: { [IN_APP_WEBVIEW]: { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight } } });

export const actions = style({ display: "flex", gap: "8px" });

/** 사이드 312 — 입력과 결과를 세로로(가로 두 칸이 좁다) */
export const compact = style({ maxWidth: "none" });
globalStyle(`${compact} ${row}`, { gridTemplateColumns: "1fr", gap: "4px" });
