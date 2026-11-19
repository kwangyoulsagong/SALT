import { style } from "@vanilla-extract/css";

export const stack = style({ display: "grid", gap: 16, marginBottom: 16 });

/** 이번 달 · 김프 | 월 적립액 — 넓으면 나란히, 좁으면 한 열 */
export const twoColumns = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 16,
  "@media": { "screen and (max-width: 900px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});
