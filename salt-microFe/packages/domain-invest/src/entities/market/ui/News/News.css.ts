import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 뉴스 행 · 모달(`FE-REQ-065`) — 참고 국내 증권 앱 웹 실측(2026-11-09, `research/2026-11-09-news-ui-measure.md`)을
 * 우리 데스크톱 글자 위계(`screen-desktop.md` §2: 14/600 · 13 · 12/500)로. 메타 색은 2단(.64 — 실측 .47 은 우리 규칙상 글자에 안 쓴다)
 */
const META_COLOR = "rgba(22,31,46,.64)";

/** 행 — 704 폭 기준 패딩 8×12 · 모서리 10 · 구분선 없음 · 호버 면(실측). 단추라 글자 정렬을 되돌린다 */
export const row = style({
  display: "flex",
  alignItems: "flex-start",
  gap: "20px",
  width: "100%",
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: "none",
  borderRadius: "10px",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  font: "inherit",
  color: "inherit",
  minWidth: 0,
  selectors: {
    "&:hover": { background: "rgba(7,25,76,.04)" },
    "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
  },
});
export const rowText = style({ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 });
export const rowTitle = style({
  margin: 0,
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
export const rowSummary = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  color: META_COLOR,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});
export const meta = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
  fontSize: vars.fontSizes.sm,
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: META_COLOR,
  fontVariantNumeric: "tabular-nums",
});
/** 썸네일 — 오른쪽 72×60 · 모서리 6 · cover(실측) */
export const thumb = style({ flexShrink: 0, width: "72px", height: "60px", borderRadius: "6px", objectFit: "cover" });

/** 모달 본문 묶음 */
export const modalBody = style({ display: "flex", flexDirection: "column", gap: vars.space.lg });
/** 관련 종목 칩 줄 — 가로로 밀기(실측: 칩 28 · 모서리 999) */
export const chips = style({ display: "flex", gap: vars.space.sm, overflowX: "auto", scrollbarWidth: "none", paddingBottom: "2px" });
export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  flexShrink: 0,
  height: "28px",
  padding: `0 ${vars.space.md}`,
  borderRadius: "999px",
  background: "rgba(2,32,71,.05)",
  fontSize: vars.typography.t7.fontSize,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  textDecoration: "none",
  whiteSpace: "nowrap",
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" } },
});
export const chipRate = styleVariants({
  up: { color: vars.colors.special.upDark, fontVariantNumeric: "tabular-nums" },
  down: { color: vars.colors.special.downDark, fontVariantNumeric: "tabular-nums" },
  flat: { color: META_COLOR, fontVariantNumeric: "tabular-nums" },
});
/** 기사 이미지 — 본문 폭 · 모서리 16(실측 552 · 16) */
export const hero = style({ width: "100%", maxHeight: "320px", borderRadius: vars.radius.large, objectFit: "cover" });
export const summary = style({ margin: 0, whiteSpace: "pre-line", overflowWrap: "anywhere" });
export const note = style({ margin: 0, fontSize: vars.typography.t7.fontSize, lineHeight: "20px", color: META_COLOR });
export const original = style({
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  minHeight: "36px",
  padding: `0 ${vars.space.md}`,
  borderRadius: "8px",
  background: "rgba(2,32,71,.05)",
  fontSize: vars.fontSizes.base,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  textDecoration: "none",
});
export const sectionTitle = style({
  margin: `${vars.space.sm} 0 0`,
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});
export const list = style({ display: "flex", flexDirection: "column", margin: `0 -${vars.space.md}` });
