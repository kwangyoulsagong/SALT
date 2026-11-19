import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 화면의 주인공 — 이번 주 총액 하나(`FE-REQ-022` FR-1). 포지션 Hero 와 같은 크기 */
export const total = style({
  fontSize: 28,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  color: vars.colors.neutral[900],
  margin: 0,
});

export const stack = style({ display: "grid", gap: 8, minWidth: 0 });

export const assetLines = style({ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 });

export const assetLine = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontVariantNumeric: "tabular-nums",
  color: vars.colors.text.primary,
  fontWeight: 600,
});

export const muted = style({ color: vars.colors.text.secondary, fontSize: 13, margin: 0 });

export const amountLine = style({
  fontSize: 18,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  color: vars.colors.text.primary,
  margin: 0,
});

/** 근거 · 성적 · 빗나간 때 — 넓으면 두 칸(성적과 빗나간 때를 같은 무게로 나란히, FR-34) */
export const evidenceGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 16,
  "@media": { "screen and (max-width: 900px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const box = style({
  display: "grid",
  gap: 6,
  alignContent: "start",
  padding: "12px 16px",
  borderRadius: 12,
  background: "rgba(13, 25, 74, 0.02)",
  minWidth: 0,
});

export const boxTitle = style({ margin: 0, fontSize: 14, fontWeight: 600, color: vars.colors.text.primary });

export const list = style({ margin: 0, paddingLeft: 18, display: "grid", gap: 4, color: vars.colors.text.primary, fontSize: 13 });

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  fontVariantNumeric: "tabular-nums",
});

export const caption = style({ textAlign: "left", fontSize: 12, color: vars.colors.text.secondary, padding: "0 0 6px" });

export const th = style({
  textAlign: "left",
  fontWeight: 500,
  fontSize: 12,
  color: vars.colors.text.secondary,
  padding: "6px 8px",
  borderBottom: `1px solid ${vars.colors.border.light}`,
});

export const td = style({ padding: "8px", color: vars.colors.text.primary, borderBottom: `1px solid ${vars.colors.border.light}` });

/** 지금 밴드 줄 — 면 + 글자("지금")를 같이(색만으로 말하지 않는다, FR-24) */
export const currentRow = style({ background: "rgba(7, 25, 76, 0.04)", fontWeight: 700 });

export const numberCell = style({ textAlign: "right" });

/** 게이트 막힘 — 회색 상자 + 사유(FR-10 · 11) */
export const blockedBox = style({
  display: "grid",
  gap: 4,
  padding: "12px 16px",
  borderRadius: 12,
  background: vars.colors.neutral[100],
  color: vars.colors.text.primary,
  fontSize: 13,
});

export const progressRow = style({ display: "grid", gap: 6 });
