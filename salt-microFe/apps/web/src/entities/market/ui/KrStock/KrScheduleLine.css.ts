import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 일정 줄 — 정보 상자 면(옅은 남색 2% · 모서리 12, 기준 화면 실측 `FE-REQ-047` 표 "정보 상자"). 행 13/600 · 라벨 12/500.
 * 높이를 고정해 로딩 자리(`KR_SCHEDULE_LINE_HEIGHT`)와 같게 둔다 — 줄이 늦게 와도 아래 표가 밀리지 않는다
 */
export const KR_SCHEDULE_LINE_HEIGHT = 44;

export const line = style({
  display: "flex",
  boxSizing: "border-box",
  width: "100%",
  // 위 띠가 상속한 글꼴이 아니라 앱 본문 글꼴 — 지정하지 않으면 시스템 명조로 떨어졌다(2026-11-02 실화면)
  fontFamily: vars.fontFamily.base,
  alignItems: "center",
  gap: vars.space.lg,
  height: KR_SCHEDULE_LINE_HEIGHT,
  // 위 지수 띠와의 간격 — 줄이 숨으면 간격도 같이 사라진다
  marginTop: vars.space.md,
  padding: `0 ${vars.space.lg}`,
  borderRadius: 12,
  background: "rgba(13, 25, 74, 0.02)",
  overflow: "hidden",
  whiteSpace: "nowrap",
});

export const label = style({
  flexShrink: 0,
  color: vars.colors.text.tertiary,
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
});

export const items = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xl,
  margin: 0,
  padding: 0,
  listStyle: "none",
  minWidth: 0,
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  fontSize: 13,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

/** D-day — 판정이 아니라 날짜 표시라 중립 면. 고정폭 숫자 */
export const dday = style({
  padding: "0 6px",
  borderRadius: 6,
  background: "rgba(2, 32, 71, 0.05)",
  color: vars.colors.text.secondary,
  fontSize: 12,
  lineHeight: "18px",
  fontVariantNumeric: vars.numeric.tabular,
});

export const date = style({
  color: vars.colors.text.tertiary,
  fontWeight: vars.fontWeights.medium,
  fontVariantNumeric: vars.numeric.tabular,
});

export const placeholder = style({ height: KR_SCHEDULE_LINE_HEIGHT, marginTop: vars.space.md });
