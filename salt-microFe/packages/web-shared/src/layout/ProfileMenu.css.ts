import { style } from "@vanilla-extract/css";

import { vars } from "../ui/tokens.css";

/** 머리 오른쪽 칸 — 높이는 머리(52, `AppNavigation`)가 정한다. 전의 화면별 80px 줄은 지웠다(`FE-REQ-054`) */
export const header = style({
  display: "flex",
  alignItems: "center",
  minWidth: 0,
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
