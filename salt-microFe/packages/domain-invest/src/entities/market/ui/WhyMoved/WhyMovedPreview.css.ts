import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 프리뷰 맨 위 한 줄 블록 — 옅은 면 · 모서리 12(정보 상자, `screen-desktop.md` §3) */
export const box = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(13,25,74,.02)",
  border: `1px solid ${vars.colors.border.light}`,
  minWidth: 0,
});
export const title = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});
export const line = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
  wordBreak: "keep-all",
  overflowWrap: "anywhere",
});
export const fact = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.lightGray,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
/** 상세로 — 페이지 이동이라 오른쪽 셰브론(링크 폭 100%) */
export const more = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  minHeight: "32px",
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
  textDecoration: "none",
});

/** ③ 한 줄 — 문장이라 두 줄까지(사실 제목 한 줄과 달리 끝이 잘리면 뜻이 바뀐다), 넘치면 말줄임 */
export const summary = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.primary,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  wordBreak: "keep-all",
  overflowWrap: "anywhere",
});
export const aiLabel = style({ margin: 0, fontSize: "11px", lineHeight: "14px", color: vars.colors.text.tertiary });
