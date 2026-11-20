import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const stack = style({ display: "grid", gap: 16, marginBottom: 16 });

/** 이번 달 · 김프 | 월 적립액 — 넓으면 나란히, 좁으면 한 열 */
export const twoColumns = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 16,
  "@media": { "screen and (max-width: 900px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

/** 설정 전(2026-11-20) — 안내 + 입력 | 정한 뒤 모양 예시. 1280 미만은 위아래 */
export const emptyGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 24,
  alignItems: "start",
  "@media": { "screen and (min-width: 1280px)": { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" } },
});

export const emptyMain = style({ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, maxWidth: 520 });

export const emptyTitle = style({
  margin: 0,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
});

export const emptyBody = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const sample = style({
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 20,
  borderRadius: 12,
  background: "rgba(13, 25, 74, 0.02)",
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
});

export const sampleHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between" });

export const sampleBadge = style({
  padding: "0 6px",
  borderRadius: 6,
  background: vars.colors.neutral[100],
  fontSize: vars.deskType.label.fontSize,
  lineHeight: "20px",
  color: vars.colors.desk.text2,
});

export const sampleHero = style({ display: "block", width: "40%", height: 24, borderRadius: 6, background: vars.colors.neutral[200] });

export const sampleRow = style({ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", alignItems: "center", gap: 12 });

export const sampleName = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.neutral[400],
});

export const sampleBar = style({ display: "block", height: 8, borderRadius: 999, background: vars.colors.neutral[200] });
