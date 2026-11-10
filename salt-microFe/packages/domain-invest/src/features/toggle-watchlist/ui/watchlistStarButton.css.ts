import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 게스트 ★ — `IconButton` sm 과 같은 칸(32)이 되게. 누르면 로그인(`FE-REQ-070`) */
export const guestStar = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: vars.radius.base,
  color: vars.colors.text.disabled,
  selectors: {
    "&:hover": { background: vars.colors.neutral[50] },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: 2 },
  },
});
