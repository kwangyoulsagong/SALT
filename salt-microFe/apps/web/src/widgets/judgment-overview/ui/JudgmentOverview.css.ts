import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 카드 2장 — PC 는 나란히, 1024px 이하는 한 줄(위험 → 성적표 순). 상세 분석과 같은 분기다(`SymbolAnalysis.css`).
 * 카드 높이는 데이터마다 달라 두 칸을 위로 맞춘다 — 늘리면 짧은 카드에 빈 흰 면이 생긴다.
 */
export const overviewGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  alignItems: "start",
  gap: "16px",
  // 시세 보드 머리와의 간격(`Margin top="xl"` 과 같은 값) — 보드가 아니라 칸이 갖는다
  marginTop: vars.space.xl,
  "@media": { "screen and (max-width: 1024px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

/** 두 칸을 다 쓰는 카드(목표 비중) */
export const overviewWide = style({ gridColumn: "1 / -1", minWidth: 0 });

/** 수화 전 자리 — 로그인 여부를 모르는 동안 표가 위아래로 튀지 않게 한 줄 높이만 잡는다 */
export const overviewPending = style({ minHeight: "1px" });

/**
 * 패널 머리의 "자세히" — 섹션 머리 텍스트 링크와 같은 모양(`market-board` reportLink)이되 색은 neutral 700.
 * tertiary 는 흰 면에서 3.03:1 로 AA 미달이었다(2026-09-29 axe)
 */
export const headLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  color: vars.colors.neutral[700],
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  ":hover": { color: vars.colors.neutral[900] },
});

/** 카드 아래 고지 · 기준 시각 — 흰 면 위 12px neutral 700(AA) */
export const footnote = style({
  margin: 0,
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
});

/**
 * 목표 비중 카드 설명 — "오를 종목을 고르지 않고 확률을 말하지 않는다"는 고지라 늘 읽혀야 한다.
 * 공용 `panelDescription`(neutral 500, 3.03:1)이 아니라 13px neutral 700(AA)
 */
export const noticeDescription = style({
  margin: 0,
  color: vars.colors.neutral[700],
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});
