import { globalStyle, style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 목표 없음 — 템플릿 고르기(`FE-REQ-060` FR-14). 글자는 데스크톱 5단 안(제목 18/700 · 이름 14/600 · 설명 12/500) */
export const start = style({ display: "flex", flexDirection: "column", gap: vars.space.xl, maxWidth: "960px" });

export const hero = style({ display: "flex", flexDirection: "column", gap: vars.space.xs });

export const title = style({
  margin: 0,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
});

export const description = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: 500,
  color: vars.colors.desk.text2,
});

export const tiles = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: vars.space.md,
});

export const tile = style({
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr)",
  gridTemplateRows: "auto auto",
  columnGap: vars.space.md,
  alignItems: "center",
  padding: vars.space.lg,
  borderRadius: "12px",
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
  color: "inherit",
  textDecoration: "none",
  transition: `background ${vars.motion.duration.instant}, transform ${vars.motion.duration.instant}`,
  selectors: {
    "&:hover": { background: SURFACE.weakFill },
    "&:active": { transform: "scale(0.99)" },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:active": { transform: "none" } } } },
});

/** 아이콘 판 — 저축 도메인 색 옅은 면(작은 표지) */
export const tileIcon = style({
  gridRow: "1 / span 2",
  display: "grid",
  placeItems: "center",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  background: "rgba(9, 146, 104, 0.1)",
  color: vars.colors.domain.savings,
});

export const tileLabel = style({
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  color: vars.colors.desk.text1,
});

export const tileHint = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/** 만든 뒤 모양의 예시 — 회색 · 정보 상자 면, "예시" 표지 */
export const sample = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  padding: vars.space.lg,
  borderRadius: "12px",
  background: SURFACE.infoFill,
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
});

export const sampleHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between" });

export const sampleTitle = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const sampleBadge = style({
  padding: "0 6px",
  borderRadius: "6px",
  background: vars.colors.neutral[100],
  fontSize: vars.deskType.label.fontSize,
  lineHeight: "20px",
  color: vars.colors.desk.text2,
});

export const sampleRow = style({
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 160px) minmax(0, 1fr)",
  alignItems: "center",
  gap: vars.space.md,
});

export const sampleIcon = style({ width: "32px", height: "32px", borderRadius: "8px", background: vars.colors.neutral[200] });

export const sampleName = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.neutral[400],
});

export const sampleBar = style({});
globalStyle(`${sampleBar}${sampleBar}`, { background: vars.colors.neutral[200] });
globalStyle(`${sampleBar} > div`, { background: vars.colors.neutral[300] });
