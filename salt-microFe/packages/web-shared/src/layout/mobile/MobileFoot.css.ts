import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { press, pressed } from "./MobilePress.css";

/**
 * 화면 바닥 — 가운데 안내 한 줄 + 회색 알약(`FE-REQ-074` FR-4). 홈 "홈 화면 설정" 알약과 같은 부품(`mobile-design.md` §2 설정 알약).
 * 회색 바탕 위에 글자 링크를 맨글자로 띄우지 않는다
 */
export const foot = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space.sm,
  margin: "12px 0 4px",
  padding: "0 20px",
  textAlign: "center",
  wordBreak: "keep-all",
});

export const footNote = style({
  margin: 0,
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
});

/** 가운데 회색 알약 — grey100 면 + 1px grey200 테두리 · 높이 44 · 아이콘 18 */
export const footPill = style({
  ...press,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  minHeight: "44px",
  padding: "0 20px",
  borderRadius: "999px",
  border: `1px solid ${vars.colors.neutral[200]}`,
  background: vars.colors.neutral[100],
  color: vars.colors.neutral[700],
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  selectors: { "&:active": pressed },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
});
