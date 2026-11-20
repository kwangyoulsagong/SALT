import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 휴대폰 저축 목록(`FE-REQ-072`) — 글자는 `appType` 만(`fontSizeBudget.test.ts` 휴대폰 표면) */
export const status = style({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: vars.space.md });

export const note = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  color: vars.colors.neutral[700],
});

export const textLink = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "44px",
  color: vars.colors.brand.primary,
  fontSize: vars.appType.body.fontSize,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
});

/** 도구 접힘 묶음 — 행 사이 선 없이 8 */
export const tools = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });
