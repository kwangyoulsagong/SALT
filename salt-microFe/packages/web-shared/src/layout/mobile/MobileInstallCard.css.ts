import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 설치 안내 카드 — 탭 화면 카드와 같은 흰 면(모서리 20 · 안쪽 20, `mobile-design.md` §1) */
export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "20px",
  borderRadius: "20px",
  background: vars.colors.background.white,
});

export const head = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" });

export const title = style({
  margin: 0,
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.neutral[800],
});

/** 닫기 — 누름 칸 44(`mobile-design.md` §5) · 모노톤 */
export const close = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "44px",
  height: "44px",
  margin: "-10px -10px -10px 0",
  border: 0,
  borderRadius: "12px",
  background: "transparent",
  color: vars.colors.neutral[500],
  cursor: "pointer",
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
});

export const body = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  color: vars.colors.neutral[700],
  wordBreak: "keep-all",
});

export const sheetBody = style({ display: "flex", flexDirection: "column", gap: "16px" });

export const figure = style({ margin: 0, display: "flex", justifyContent: "center" });

export const steps = style({
  margin: 0,
  paddingLeft: "22px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  color: vars.colors.neutral[800],
});

export const step = style({ wordBreak: "keep-all" });
