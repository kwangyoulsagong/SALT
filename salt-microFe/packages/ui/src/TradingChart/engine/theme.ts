import { tokens } from "@repo/tokens";

/**
 * 캔버스 색 · 글꼴. 캔버스는 CSS 변수를 못 읽어서 `@repo/tokens` 값을 직접 쓴다
 * (`FE-REQ-034` 설계 원칙 — 색은 토큰). 상승 빨강 · 하락 파랑을 뒤집지 않는다.
 */
const c = tokens.colors;

export const CHART_THEME = {
  up: c.special.up,
  down: c.special.down,
  flat: c.neutral[400],
  grid: c.neutral[100],
  axisText: c.neutral[500],
  text: c.neutral[800],
  paneBorder: c.neutral[200],
  crosshair: c.neutral[500],
  badgeBg: c.neutral[800],
  badgeText: c.text.white,
  priceLineNeutral: c.neutral[500],
  priceLineDown: c.special.down,
  /** 범위 밖 가격선 표시의 바탕 — 캔들 위에서도 읽히게 */
  edgeMarkBg: "rgba(255, 255, 255, 0.85)",
  volumeAlpha: 0.55,
  volumeAverage: c.status.info,
  /** 이동평균 색 — 기간 순서대로. 넘치면 돈다 */
  movingAverages: [c.status.successDark, c.special.pink, c.special.orange, c.special.purple],
  font: `11px ${tokens.fontFamily.base}`,
  fontBold: `600 11px ${tokens.fontFamily.base}`,
} as const;

export const movingAverageColor = (order: number): string =>
  CHART_THEME.movingAverages[order % CHART_THEME.movingAverages.length]!;

/** 레이아웃 상수 (px) */
export const CHART_LAYOUT = {
  priceAxisWidth: 76,
  timeAxisHeight: 24,
  /** 거래량 창이 plot 높이에서 차지하는 비율 */
  volumeRatio: 0.22,
  paneGap: 8,
  topPadding: 8,
  /** 가격 범위 위아래 여백 비율 */
  pricePadding: 0.08,
  /** 가격 눈금 목표 개수(높이 300px 기준) */
  priceTickPerPx: 1 / 56,
  /** 시간 라벨 최소 간격 */
  timeLabelGap: 72,
  badgeHeight: 18,
} as const;
