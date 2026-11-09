import { globalStyle, style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 검색 모달 칸(`FE-REQ-066` FR-2 — 실측 2026-11-09): 검색칸 616×40(위 12 · 좌우 12) · 본문만 스크롤 · 아래 안내 바 52.
 * 판 크기 · 모서리 · 그림자는 `@repo/ui` `Modal` `size="search"` 가 정한다
 */
const SURFACE = "rgba(2, 32, 71, 0.05)";

export const top = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  flexShrink: 0,
  padding: `${vars.space.md} ${vars.space.md} ${vars.space.sm}`,
});

/** 검색칸 40 · 모서리 10 · 입력 15/600(실측) */
export const field = style({ flex: 1, minWidth: 0, height: "40px", borderRadius: "10px", background: SURFACE });
globalStyle(`${field} input`, { fontSize: "15px", fontWeight: vars.fontWeights.semibold });

export const body = style({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: `0 ${vars.space.md} ${vars.space.md}`,
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
});

export const sectionHead = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.md} ${vars.space.xs}`,
  margin: 0,
  listStyle: "none",
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});

export const sectionMeta = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: "rgba(22, 31, 46, 0.64)",
});

export const list = style({ display: "flex", flexDirection: "column", gap: "2px", margin: 0, padding: 0 });
export const group = style({ display: "flex", flexDirection: "column", gap: "2px", margin: 0, padding: 0 });

export const chips = style({ display: "flex", flexWrap: "wrap", gap: vars.space.sm, padding: `0 ${vars.space.md}` });

/** 최근 검색 칩 28 · 모서리 999 · 13/600(실측) — 글자 단추 + × 단추 */
export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  height: "28px",
  borderRadius: "999px",
  background: "rgba(7, 25, 76, 0.04)",
  overflow: "hidden",
});

const chipButton = style({
  border: "none",
  background: "transparent",
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: SURFACE },
    "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "-2px" },
  },
});
export const chipText = style([chipButton, { height: "28px", padding: `0 ${vars.space.xs} 0 ${vars.space.sm}` }]);
export const chipRemove = style([
  chipButton,
  { display: "inline-flex", alignItems: "center", height: "28px", padding: `0 ${vars.space.sm} 0 2px`, color: vars.colors.neutral[700] },
]);

export const counter = style({
  whiteSpace: "nowrap",
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});

/** 상한에 닿은 카운터 — 색만이 아니라 굵기도 바꾼다(`a11y-policy.md`) */
export const counterFull = style([counter, { color: vars.colors.text.primary, fontWeight: vars.fontWeights.bold }]);

export const empty = style({ padding: `${vars.space.lg} ${vars.space.md}`, display: "flex", flexDirection: "column", gap: vars.space.xs });

/** 아래 안내 바 52 · 반투명 면 · 키 칩 28×24 모서리 6(실측) */
export const footer = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.lg,
  flexShrink: 0,
  height: "52px",
  padding: `0 ${vars.space.xl}`,
  borderTop: `1px solid ${SURFACE}`,
  background: "rgba(253, 253, 255, 0.75)",
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
  "@media": { "screen and (max-width: 767px)": { display: "none" } },
});

export const footerItem = style({ display: "inline-flex", alignItems: "center", gap: "6px" });

export const keyChip = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "28px",
  height: "24px",
  padding: "0 4px",
  borderRadius: "6px",
  background: SURFACE,
  fontSize: "12px",
  fontWeight: vars.fontWeights.semibold,
});

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});
