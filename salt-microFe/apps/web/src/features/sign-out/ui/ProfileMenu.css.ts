import { style } from "@vanilla-extract/css";

import { vars } from "@/shared/ui/tokens.css";

/** 헤더 한 줄 — 전의 `ProfileHeader` 와 같은 자리 · 같은 높이(화면마다 헤더가 흔들리지 않게). */
export const header = style({
  width: "100%",
  padding: "20px",
  height: "80px",
  display: "flex",
  alignItems: "center",
});

/** 프로필 전체가 버튼이다. 버튼 기본 모양을 걷고 프로필 모양 그대로 둔다. */
export const trigger = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
  maxWidth: "100%",
  padding: "4px 8px 4px 4px",
  margin: "-4px -8px -4px -4px",
  border: "none",
  borderRadius: "12px",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
  selectors: {
    "&:hover": { background: vars.colors.background.third },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});
