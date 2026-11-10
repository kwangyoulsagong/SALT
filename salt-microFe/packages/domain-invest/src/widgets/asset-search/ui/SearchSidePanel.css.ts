import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 곁 칸(`FE-REQ-066` FR-8 — 실측: 두 칸 중 오른쪽, 머리 14 · 종목 행 셋). 왼쪽 결과와 0.75px 선으로 가른다. 768 밑은 숨김(한 열 시트)
 */
export const panel = style({
  width: "232px",
  flexShrink: 0,
  padding: `0 ${vars.space.md} ${vars.space.md}`,
  borderLeft: "1px solid rgba(2, 32, 71, 0.05)",
  overflowY: "auto",
  "@media": { "screen and (max-width: 767px)": { display: "none" } },
});

export const hint = style({
  margin: 0,
  padding: `${vars.space.sm} 0`,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: "rgba(22, 31, 46, 0.64)",
});

export const heading = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: vars.space.xs,
  margin: 0,
  padding: `${vars.space.sm} 0 ${vars.space.xs}`,
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});

export const list = style({ display: "flex", flexDirection: "column", gap: "2px", margin: 0, padding: 0, listStyle: "none" });

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  minHeight: "40px",
  padding: `${vars.space.xs} ${vars.space.sm}`,
  borderRadius: "8px",
  color: vars.colors.text.primary,
  textDecoration: "none",
  selectors: {
    "&:hover": { background: "rgba(2, 32, 71, 0.05)" },
    "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "-2px" },
  },
});

export const name = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

const changeBase = style({ fontSize: "13px", lineHeight: "20px", fontWeight: vars.fontWeights.semibold, fontVariantNumeric: "tabular-nums", flexShrink: 0 });
/** 작은 등락 글자는 짙은 등락색(검색 행과 같은 이유 — 흰 면 4.5:1) */
export const change = styleVariants({
  up: [changeBase, { color: vars.colors.special.upDark }],
  down: [changeBase, { color: vars.colors.special.downDark }],
  flat: [changeBase, { color: vars.colors.neutral[700] }],
});
