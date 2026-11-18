import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

export const heroTotal = style({
  fontSize: 28,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  color: vars.colors.neutral[900],
  margin: 0,
});

export const chartBox = style({ width: "100%", minHeight: 120 });

export const radarLayout = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 384px) minmax(0, 1fr)",
  gap: 24,
  alignItems: "center",
  "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "minmax(0, 1fr)", justifyItems: "center" } },
});

export const reasonList = style({ margin: 0, paddingLeft: 18, display: "grid", gap: 4 });

/** 표 제목 — 눈엔 안 보이고 스크린 리더가 읽는다 */
export const visuallyHidden = style({
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});

/** 숫자 목록 두 단 — 좁은 칸(720 미만)에선 한 단. `KeyValueList` 2단은 화면 폭(360)으로 갈려 패널 안에선 너무 좁다 */
export const pairGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  columnGap: 24,
  "@media": { "screen and (max-width: 720px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

/** 표 안 짧은 낱말(축 이름) — 좁은 칸에서 한 글자씩 꺾이지 않게 */
export const noWrap = style({ whiteSpace: "nowrap" });
