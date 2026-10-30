import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@/shared/ui/surface.css";

import { gaugeValue, gaugeValueMuted } from "./TradeRisk.css";

/**
 * 판정 근거 상세(F004 FR-33 · 34) — 성적표 카드(`TradeRisk.css`)와 같은 조밀형 · 같은 옅은 면.
 * 막대는 손실 · 이익을 색으로 가르지 않는다 — 구간 이름이 말하고, 빨강 · 초록은 좋고 나쁨으로 읽힌다.
 */

const NARROW = "screen and (max-width: 640px)";

/** 성적 4칸 — 넓으면 한 줄 넷, 좁으면 2 × 2(한 줄 하나면 390 폭에서 칸 넷이 화면 하나를 채운다) */
export const metrics = style({
  margin: 0,
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: vars.space.sm,
  fontFamily: vars.fontFamily.base,
  "@media": { [NARROW]: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } },
});

/** 성적 칸 값 — `<dd>` 기본 여백을 뺀 게이지 값 */
export const metricValue = style([gaugeValue, { margin: 0 }]);
export const metricValueMuted = style([gaugeValueMuted, { margin: 0 }]);

export const bars = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontFamily: vars.fontFamily.base,
});

export const barRow = style({
  display: "grid",
  gridTemplateColumns: "96px minmax(0, 1fr) 56px",
  alignItems: "center",
  columnGap: vars.space.sm,
  fontSize: "13px",
  lineHeight: "20px",
  fontVariantNumeric: vars.numeric.tabular,
  "@media": { [NARROW]: { gridTemplateColumns: "84px minmax(0, 1fr) 48px" } },
});

/** 옅은 면 위가 아니라 흰 패널 위 — neutral 700 은 AA */
export const barLabel = style({ color: vars.colors.neutral[700], fontWeight: vars.fontWeights.medium, whiteSpace: "nowrap" });

export const barTrack = style({
  height: "12px",
  borderRadius: "6px",
  background: SURFACE.weakFill,
  overflow: "hidden",
});

export const barFill = style({
  height: "100%",
  borderRadius: "6px",
  background: vars.colors.text.primary,
  opacity: 0.4,
});

export const barCount = style({
  textAlign: "right",
  color: vars.colors.text.primary,
  fontWeight: vars.fontWeights.semibold,
});

/** 맞았던 때 · 틀렸던 때 — 같은 너비 두 칸, 좁은 폭은 위아래(FR-142). 순서 · 크기 · 위계가 같다 */
export const caseColumns = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: vars.space.md,
  "@media": { [NARROW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const caseColumn = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "14px 16px",
  borderRadius: "12px",
  background: SURFACE.weakFill,
  minWidth: 0,
});

export const caseHeading = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
});

/** 날짜 | 종목 | 수익률 — 좁은 칸에서 수익률이 다음 줄로 내려간다 */
export const caseRow = style({
  display: "grid",
  // 날짜 칸은 성적표 빗나간 판정 줄(`missRow`)과 같은 56px — 48px 에서 "10월 26일" 이 두 줄로 꺾였다
  gridTemplateColumns: "56px minmax(0, 1fr) auto",
  alignItems: "center",
  columnGap: vars.space.sm,
  padding: `${vars.space.sm} 0`,
  borderBottom: `1px solid ${vars.colors.neutral[100]}`,
  color: vars.colors.text.secondary,
  fontSize: "13px",
  lineHeight: "20px",
  fontVariantNumeric: vars.numeric.tabular,
  selectors: { "&:last-child": { borderBottom: "none", paddingBottom: 0 } },
});

export const caseDate = style({ whiteSpace: "nowrap" });

export const caseList = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" });

export const caseReturn = style({ color: vars.colors.text.primary, fontWeight: vars.fontWeights.semibold, whiteSpace: "nowrap" });

/** 성적표 그룹 → 상세 링크. 페이지 이동이라 오른쪽 셰브론(`NavChevron`) */
export const evidenceLink = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: "2px",
  marginTop: "2px",
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  ":hover": { color: vars.colors.neutral[900] },
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px", borderRadius: "4px" } },
});
