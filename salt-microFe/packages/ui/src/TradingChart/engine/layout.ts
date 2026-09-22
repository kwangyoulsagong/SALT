import { CHART_LAYOUT } from "./theme";

export interface ChartLayout {
  width: number;
  height: number;
  plotWidth: number;
  priceTop: number;
  priceBottom: number;
  volumeTop: number;
  volumeBottom: number;
  timeAxisTop: number;
}

/** CSS 크기 → 영역. 가격 창 · 거래량 창 · 시간축 */
export const computeLayout = (width: number, height: number): ChartLayout => {
  const plotWidth = Math.max(0, width - CHART_LAYOUT.priceAxisWidth);
  const timeAxisTop = height - CHART_LAYOUT.timeAxisHeight;
  const plotHeight = Math.max(0, timeAxisTop - CHART_LAYOUT.topPadding);
  const volumeHeight = Math.round(plotHeight * CHART_LAYOUT.volumeRatio);
  const volumeBottom = timeAxisTop;
  const volumeTop = volumeBottom - volumeHeight;
  return {
    width,
    height,
    plotWidth,
    priceTop: CHART_LAYOUT.topPadding,
    priceBottom: volumeTop - CHART_LAYOUT.paneGap,
    volumeTop,
    volumeBottom,
    timeAxisTop,
  };
};
