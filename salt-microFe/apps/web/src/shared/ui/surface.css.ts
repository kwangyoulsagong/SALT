import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 화면 표면 — 회색 바탕 위 흰 패널 (2026-09-23 참고 화면 실측).
 *
 * 실측(1440px · 12개 기능 페이지):
 * - 바탕은 옅은 회색, 패널은 흰 면 · 모서리 16px · **바깥 그림자 없이 1px 안쪽 헤어라인**
 * - 패널 제목 18/24 bold, 본문은 13~14px semibold 중심, 보조 글은 12px 회색
 * - 보조 버튼 높이 28 · 13px semibold · 모서리 7 · 옅은 회색 면
 * - 종목 로고는 원형 28~40px — 이름이 나오는 자리에는 늘 있다
 *
 * 상세 분석 · 코치 리포트가 같이 쓴다. 한 화면만 다른 카드 모양이면 다른 제품처럼 보인다.
 */
export const SURFACE = {
  panelRadius: "16px",
  hairline: "inset 0 0 0 1px rgba(2, 32, 71, 0.05)",
  weakFill: "rgba(7, 25, 76, 0.04)",
} as const;

const NARROW = "screen and (max-width: 640px)";

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "20px 24px 24px",
  borderRadius: SURFACE.panelRadius,
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
  minWidth: 0,
  "@media": { [NARROW]: { padding: "16px 16px 20px" } },
});

export const panelHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
  minHeight: "28px",
});

export const panelTitle = style({
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  color: vars.colors.text.primary,
  fontSize: "18px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.bold,
});

/** 제목 아래 한 줄 설명 */
export const panelDescription = style({
  margin: "-8px 0 0",
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/** 옅은 회색 면 상자 — 안내 · 요약 · 지표 칸 */
export const weakBox = style({
  borderRadius: "12px",
  background: SURFACE.weakFill,
});

/** 화면 머리의 되돌아가기 */
export const backLink = style({
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  color: vars.colors.neutral[600],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  ":hover": { color: vars.colors.neutral[800] },
});
