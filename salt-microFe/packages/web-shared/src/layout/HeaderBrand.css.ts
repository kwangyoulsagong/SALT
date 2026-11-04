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

// 링크 안으로 한 단 좁혀 Logo 의 `display: block` 보다 우선한다 — 같은 단이면 CSS 청크 순서가 이긴다(둘 다 보일 수 있다)
export const full = style({
  selectors: { [`${link} &`]: { display: "none" } },
  "@media": { [DESKTOP]: { selectors: { [`${link} &`]: { display: "block" } } } },
});
export const symbol = style({ "@media": { [DESKTOP]: { selectors: { [`${link} &`]: { display: "none" } } } } });
