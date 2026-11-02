import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const stack = style({ display: "flex", flexDirection: "column", gap: vars.space.md, marginTop: vars.space.md });

/** 다른 화면으로 가는 한 줄 — `settings-panel` 의 내 기준 줄과 같은 모양(셰브론 오른쪽 끝) */
export const navRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
  width: "100%",
  minHeight: "44px",
  padding: "0 4px",
  borderRadius: "8px",
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  wordBreak: "keep-all",
  selectors: {
    "&:hover": { background: "rgba(7, 25, 76, 0.04)" },
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" },
  },
});
