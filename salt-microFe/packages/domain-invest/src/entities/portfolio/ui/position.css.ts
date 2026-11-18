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

/** 거래 기록 한 줄(F006 G절 2단계) — 왼쪽 아이콘 · 이름 · 날짜, 오른쪽 수량 × 단가 · 총액. 좁은 칸은 금액 묶음이 아랫줄로 */
export const ledgerRow = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
});
export const ledgerIdentity = style({ display: "flex", alignItems: "center", gap: 12, minWidth: 0 });
export const ledgerAmounts = style({ display: "grid", justifyItems: "end", gap: 2, fontVariantNumeric: "tabular-nums", marginLeft: "auto" });
export const ledgerTexts = style({ display: "grid", gap: 2, minWidth: 0 });
export const ledgerName = style({ fontWeight: 600, color: vars.colors.text.primary, overflowWrap: "anywhere" });
/** 작은 보조 글자 — 행 호버 면(neutral 50) 위에서도 AA. `subtle` 단은 흰 면 4.62 · 호버 면 4.41 이라 모자랐다(2026-11-18 axe) */
export const ledgerSub = style({ fontSize: 13, color: vars.colors.text.secondary });
export const ledgerTotal = style({ fontWeight: 600, color: vars.colors.text.primary });
