import type { BaseFrame } from "./drawBase";
import { formatCompact, formatNumber } from "./format";
import type { ChartLayout } from "./layout";
import type { ChartSeries } from "./series";
import { CHART_LAYOUT, CHART_THEME } from "./theme";
import { formatFullTime } from "./time";
import { indexToX, type Viewport } from "./viewport";

export interface Crosshair {
  /** 가리킨 봉 */
  index: number;
  /** 포인터 y. 키보드로 옮길 때는 `null` — 가로선은 그 봉 종가에 둔다 */
  y: number | null;
}

/**
 * 오버레이 캔버스 — 십자선과 두 배지만. **봉 수와 무관하게 O(1)** 이다(`FE-REQ-034` 성능 예산 —
 * 포인터 이동 1회 ≤ 2ms). 기본 캔버스를 건드리지 않는다.
 */
export const drawOverlay = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  series: ChartSeries,
  vp: Viewport,
  frame: BaseFrame,
  crosshair: Crosshair | null,
  intraday: boolean,
  offsetMinutes: number,
): void => {
  const { width, height, plotWidth, priceTop, priceBottom, volumeTop, volumeBottom, timeAxisTop } =
    layout;
  ctx.clearRect(0, 0, width, height);
  if (!crosshair || !frame.range || series.length === 0) return;

  const cx = Math.round(indexToX(crosshair.index, series.length, plotWidth, vp)) + 0.5;
  if (cx < 0 || cx > plotWidth) return;
  const y = crosshair.y ?? frame.price.toY(series.close[crosshair.index]!);
  const cy = Math.round(y) + 0.5;

  ctx.strokeStyle = CHART_THEME.crosshair;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, priceTop);
  ctx.lineTo(cx, volumeBottom);
  if (cy >= priceTop && cy <= volumeBottom) {
    ctx.moveTo(0, cy);
    ctx.lineTo(plotWidth, cy);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = CHART_THEME.font;
  ctx.textBaseline = "middle";
  const h = CHART_LAYOUT.badgeHeight;

  // 가격축 배지 — 가격 창이면 가격, 거래량 창이면 거래량
  let valueText: string | null = null;
  if (cy >= priceTop && cy <= priceBottom) {
    valueText = formatNumber(frame.price.fromY(cy), frame.priceDecimals);
  } else if (cy >= volumeTop && cy <= volumeBottom) {
    valueText = formatCompact(Math.max(0, frame.volume.fromY(cy)));
  }
  if (valueText) {
    const w = ctx.measureText(valueText).width + 10;
    ctx.fillStyle = CHART_THEME.badgeBg;
    ctx.fillRect(plotWidth + 1, cy - h / 2, w, h);
    ctx.fillStyle = CHART_THEME.badgeText;
    ctx.fillText(valueText, plotWidth + 6, cy);
  }

  // 시간축 배지 — 가장자리에서 잘리지 않게
  const timeText = formatFullTime(series.time[crosshair.index]!, offsetMinutes, intraday);
  const tw = ctx.measureText(timeText).width + 12;
  const left = Math.min(Math.max(0, cx - tw / 2), plotWidth - tw);
  ctx.fillStyle = CHART_THEME.badgeBg;
  ctx.fillRect(left, timeAxisTop + 3, tw, h);
  ctx.fillStyle = CHART_THEME.badgeText;
  ctx.textAlign = "center";
  ctx.fillText(timeText, left + tw / 2, timeAxisTop + 3 + h / 2);
  ctx.textAlign = "left";
};
