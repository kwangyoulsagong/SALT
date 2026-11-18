import { style } from "@vanilla-extract/css";

import { vars as uiVars } from "@repo/ui/tokens";

/** 머리 아이콘 버튼 — 머리 내비 링크와 같은 36 높이 · 모서리 9(`screen-desktop.md` §1) */
export const bell = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  marginRight: 8,
  borderRadius: 9,
  color: "rgba(24,31,43,.77)",
  textDecoration: "none",
  selectors: {
    "&:hover": { background: "rgba(7,25,76,.04)" },
    "&:focus-visible": { outline: `2px solid ${uiVars.colors.brand.primary}`, outlineOffset: 2 },
  },
});

/** 안 읽은 수 — 색만으로 알리지 않는다(숫자가 글자). 흰 글자는 굵게(작은 흰 글자 대비 규칙) */
export const badge = style({
  position: "absolute",
  top: 2,
  right: 0,
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  borderRadius: 999,
  background: uiVars.colors.brand.primary,
  color: uiVars.colors.text.white,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: "16px",
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
});
