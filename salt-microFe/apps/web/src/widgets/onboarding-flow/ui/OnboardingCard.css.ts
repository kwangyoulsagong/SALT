import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

/**
 * 앱 웹뷰 홈 맨 위 한 줄 배너(`FE-REQ-060` FR-M3) — 옅은 브랜드 면 · 글 `t6` · 오른쪽 닫기 44. 글자를 키우면 줄바꿈(FR-M4)
 */
export const banner = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 4px 4px 16px",
  borderRadius: "12px",
  background: vars.colors.brand.lighter,
});

export const bannerLink = style({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  flex: 1,
  minWidth: 0,
  minHeight: "44px",
  color: vars.colors.text.primary,
  textDecoration: "none",
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
});

export const bannerText = style({
  flex: 1,
  minWidth: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  selectors: { [IN_APP_WEBVIEW]: { fontSize: vars.appType.desc.fontSize, lineHeight: vars.appType.desc.lineHeight } },
});

export const closeButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "44px",
  height: "44px",
  border: "none",
  borderRadius: "999px",
  background: "transparent",
  color: vars.colors.text.tertiary,
  fontSize: vars.deskType.title.fontSize,
  cursor: "pointer",
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
});
