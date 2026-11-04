import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 1024 이상 = 글자 로고, 그 아래(768~1023) = 심볼만(`FE-REQ-051` FR-2). 폭은 CSS 로만 가른다(`ssr.md`) */
const DESKTOP = "screen and (min-width: 1024px)";

export const link = style({
  display: "inline-flex",
  alignItems: "center",
  height: "36px",
  padding: "0 4px",
  borderRadius: "9px",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
  },
});

export const full = style({ display: "none", "@media": { [DESKTOP]: { display: "block" } } });
export const symbol = style({ "@media": { [DESKTOP]: { display: "none" } } });
