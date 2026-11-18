import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const list = style({ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 });

/** 행 → 같은 시트로 고치기(FR-106). 다른 페이지로 가지 않으니 셰브론 없음 · 폭 100% 버튼 */
export const rowButton = style({
  display: "block",
  width: "100%",
  border: 0,
  background: "transparent",
  padding: "8px",
  borderRadius: 8,
  textAlign: "left",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  ":hover": { background: vars.colors.neutral[50] },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: 2 },
});

export const head = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 });
export const headAction = style({ marginLeft: "auto" });
export const description = style({ margin: "4px 0 12px", fontSize: 13, color: vars.colors.text.lightGray });
export const more = style({ display: "flex", justifyContent: "center", marginTop: 8 });
