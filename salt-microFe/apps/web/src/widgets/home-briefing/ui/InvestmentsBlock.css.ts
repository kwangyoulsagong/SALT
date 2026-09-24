import { style } from "@vanilla-extract/css";

import { vars } from "@/shared/ui/tokens.css";

/** 카드 모양은 그대로 — 링크 밑줄 · 색만 걷는다. 누를 수 있다는 것은 커서와 포커스 링으로 알린다. */
export const investmentsLink = style({
  display: "block",
  color: "inherit",
  textDecoration: "none",
  borderRadius: "16px",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});
