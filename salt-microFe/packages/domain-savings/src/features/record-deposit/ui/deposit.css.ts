import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

export const form = style({ display: "flex", flexDirection: "column", gap: "12px" });

// 앱 웹뷰 글자 13 이상(`RN-REQ-032` FR-7 · `FE-REQ-060` FR-M)
export const hint = style({ minHeight: "16px", fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.text.tertiary, selectors: { [IN_APP_WEBVIEW]: { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight } } });

/* ── 데스크톱 좁은 칸(`FE-REQ-060` FR-8 · 9) — 날짜 · 메모 접힘 · 저장 32 내용 폭 ── */
export const more = style({ display: "flex", flexDirection: "column" });
export const moreSummary = style({
  cursor: "pointer",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" } },
});
export const moreBody = style({ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" });
export const submitInline = style({ alignSelf: "flex-start", minWidth: "96px" });
