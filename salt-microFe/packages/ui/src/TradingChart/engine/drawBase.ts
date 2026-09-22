import type { TradingPriceBand, TradingPriceLine } from "../types";
import { formatCompact, formatPrice } from "./format";
import type { ChartLayout } from "./layout";
import { decimalsForStep, linearScale, type LinearScale, niceStep, niceTicks, priceExtent } from "./scale";
import { type ChartSeries, extremaIndices } from "./series";
import { CHART_LAYOUT, CHART_THEME, movingAverageColor } from "./theme";
import { buildTimeTicks, formatShortDate, type TimeTickLabels } from "./time";
import { indexToX, type Viewport, visibleRange } from "./viewport";

export interface BaseDrawOptions {
  priceLines: readonly TradingPriceLine[];
  priceBand: TradingPriceBand | null;
  /** 그릴 이동평균의 `series.movingAverages` 번호. 숨긴 선은 빠진다 */
  visibleAverages: readonly number[];
  intraday: boolean;
  offsetMinutes: number;
  timeLabels: TimeTickLabels;
}

/** 그린 결과 — 오버레이가 포인터 y → 가격을 바꿀 때 쓴다 */
export interface BaseFrame {
  price: LinearScale;
  volume: LinearScale;
  priceDecimals: number;
  range: { from: number; to: number } | null;
}

const EMPTY_FRAME: BaseFrame = {
  price: linearScale(0, 1, 0, 1),
  volume: linearScale(0, 1, 0, 1),
  priceDecimals: 0,
  range: null,
};

/** 가장자리 표시 한 줄 높이 */
const EDGE_ROW = 16;

const lineColor = (tone: TradingPriceLine["tone"]): string =>
  tone === "down" ? CHART_THEME.priceLineDown : tone === "zone" ? CHART_THEME.zone : CHART_THEME.priceLineNeutral;

/** 이름표 높이 · 띠 안쪽 여백 */
const ZONE_CHIP_HEIGHT = 20;
const ZONE_CHIP_INSET = 6;

/** 반 픽셀 정렬 — 1px 선이 두 픽셀에 번지지 않게 */
const crisp = (v: number) => Math.round(v) + 0.5;

const badge = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
  fg: string,
) => {
  const h = CHART_LAYOUT.badgeHeight;
  const w = ctx.measureText(text).width + 10;
  ctx.fillStyle = bg;
  ctx.fillRect(x, Math.round(y - h / 2), w, h);
  ctx.fillStyle = fg;
  ctx.fillText(text, x + 5, y);
};

/**
 * 기본 캔버스 — 격자 · 캔들 · 이동평균 · 거래량 · 가격선 · 현재가 · 최고/최저 · 축.
 * **포인터 이동으로는 불리지 않는다**(`FE-REQ-034` 설계 — 레이어 두 장).
 *
 * 같은 색 도형은 경로 하나로 모아 한 번에 칠한다 — 봉마다 `fillStyle` 을 바꾸면 상태 변경이 봉 수만큼 생긴다.
 */
export const drawBase = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  series: ChartSeries,
  vp: Viewport,
  options: BaseDrawOptions,
): BaseFrame => {
  const { width, height, plotWidth, priceTop, priceBottom, volumeTop, volumeBottom, timeAxisTop } =
    layout;
  ctx.clearRect(0, 0, width, height);
  const range = visibleRange(series.length, plotWidth, vp);
  if (!range || plotWidth <= 0) return EMPTY_FRAME;
  const { from, to } = range;
  const n = series.length;
  const x = (i: number) => indexToX(i, n, plotWidth, vp);

  ctx.font = CHART_THEME.font;
  ctx.textBaseline = "middle";

  // ── 스케일
  const extent = priceExtent(series.low, series.high, from, to, CHART_LAYOUT.pricePadding);
  // 범위 밖 가격선은 가장자리 줄에 그린다 — 그 줄 수만큼 위아래를 비워 캔들 · 최고/최저 표시와 겹치지 않게
  // (375px 실측). 범위는 캔들만으로 정한다(FR-9) — 선 때문에 캔들이 납작해지지 않는다
  const linesAbove = options.priceLines.filter((line) => line.price > extent.max).length;
  const linesBelow = options.priceLines.filter((line) => line.price < extent.min).length;
  const scaleTop = priceTop + linesAbove * EDGE_ROW;
  const scaleBottom = priceBottom - linesBelow * EDGE_ROW;
  const price = linearScale(extent.min, extent.max, scaleTop, scaleBottom);
  const tickCount = Math.max(2, Math.round((priceBottom - priceTop) * CHART_LAYOUT.priceTickPerPx));
  const priceTicks = niceTicks(extent.min, extent.max, tickCount);
  const priceDecimals = decimalsForStep(niceStep(extent.max - extent.min, tickCount));
  let maxVolume = 0;
  for (let i = from; i <= to; i += 1) if (series.volume[i]! > maxVolume) maxVolume = series.volume[i]!;
  const volume = linearScale(0, maxVolume || 1, volumeTop + 4, volumeBottom);
  const timeTicks = buildTimeTicks(
    series.time,
    from,
    to,
    vp.barSpacing,
    options.intraday,
    options.offsetMinutes,
    CHART_LAYOUT.timeLabelGap,
    options.timeLabels,
  );

  // ── 격자
  ctx.strokeStyle = CHART_THEME.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const tick of priceTicks) {
    const y = crisp(price.toY(tick));
    ctx.moveTo(0, y);
    ctx.lineTo(plotWidth, y);
  }
  for (const tick of timeTicks) {
    const tx = crisp(x(tick.index));
    ctx.moveTo(tx, priceTop);
    ctx.lineTo(tx, volumeBottom);
  }
  ctx.stroke();

  // 창 경계
  ctx.strokeStyle = CHART_THEME.paneBorder;
  ctx.beginPath();
  ctx.moveTo(0, crisp(volumeTop - CHART_LAYOUT.paneGap / 2));
  ctx.lineTo(plotWidth, crisp(volumeTop - CHART_LAYOUT.paneGap / 2));
  ctx.moveTo(crisp(plotWidth), 0);
  ctx.lineTo(crisp(plotWidth), timeAxisTop);
  ctx.moveTo(0, crisp(timeAxisTop));
  ctx.lineTo(width, crisp(timeAxisTop));
  ctx.stroke();

  // ── 가격 구간 띠 — 캔들 **아래**. 가격 창 안으로 자른다(범위 밖이면 걸친 만큼만)
  const band = options.priceBand;
  let bandRect: { top: number; bottom: number } | null = null;
  if (band && band.upper > extent.min && band.lower < extent.max) {
    // 가장자리 표시 줄은 비워 둔다 — 범위 밖 경계선의 ▲▼ 표시가 그 자리에 있다
    const bandTop = Math.max(scaleTop, price.toY(band.upper));
    const bandBottom = Math.min(scaleBottom, price.toY(band.lower));
    bandRect = { top: bandTop, bottom: bandBottom };
    ctx.fillStyle = CHART_THEME.zoneFill;
    ctx.fillRect(0, bandTop, plotWidth, bandBottom - bandTop);
  }

  // ── 가격 창 · 거래량 창만 칠한다(축 위로 번지지 않게)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, plotWidth, timeAxisTop);
  ctx.clip();

  const bodyWidth = Math.max(1, Math.floor(vp.barSpacing * 0.7));
  const groups: Array<{ color: string; test: (o: number, c: number) => boolean }> = [
    { color: CHART_THEME.up, test: (o, c) => c > o },
    { color: CHART_THEME.down, test: (o, c) => c < o },
    { color: CHART_THEME.flat, test: (o, c) => c === o },
  ];

  // 거래량 — 색별 한 번씩
  ctx.globalAlpha = CHART_THEME.volumeAlpha;
  for (const group of groups) {
    ctx.fillStyle = group.color;
    ctx.beginPath();
    for (let i = from; i <= to; i += 1) {
      if (!group.test(series.open[i]!, series.close[i]!)) continue;
      const top = volume.toY(series.volume[i]!);
      ctx.rect(Math.round(x(i) - bodyWidth / 2), top, bodyWidth, volumeBottom - top);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const strokeSeries = (values: Float64Array, scale: LinearScale, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    let pen = false;
    for (let i = from; i <= to; i += 1) {
      const v = values[i]!;
      if (Number.isNaN(v)) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(x(i), scale.toY(v));
      else ctx.moveTo(x(i), scale.toY(v));
      pen = true;
    }
    ctx.stroke();
  };
  strokeSeries(series.volumeAverage, volume, CHART_THEME.volumeAverage);

  // 캔들 — 색별로 꼬리 한 경로 + 몸통 한 경로
  ctx.lineWidth = 1;
  for (const group of groups) {
    ctx.strokeStyle = group.color;
    ctx.fillStyle = group.color;
    ctx.beginPath();
    for (let i = from; i <= to; i += 1) {
      if (!group.test(series.open[i]!, series.close[i]!)) continue;
      const cx = crisp(x(i));
      ctx.moveTo(cx, price.toY(series.high[i]!));
      ctx.lineTo(cx, price.toY(series.low[i]!));
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = from; i <= to; i += 1) {
      if (!group.test(series.open[i]!, series.close[i]!)) continue;
      const yOpen = price.toY(series.open[i]!);
      const yClose = price.toY(series.close[i]!);
      const top = Math.min(yOpen, yClose);
      ctx.rect(Math.round(x(i) - bodyWidth / 2), top, bodyWidth, Math.max(1, Math.abs(yClose - yOpen)));
    }
    ctx.fill();
  }

  // 이동평균 — 범위를 늘리지 않고 창에서 잘린다(FR-9)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, priceTop, plotWidth, priceBottom - priceTop);
  ctx.clip();
  for (const order of options.visibleAverages) {
    const ma = series.movingAverages[order];
    if (ma) strokeSeries(ma.values, price, movingAverageColor(order));
  }
  ctx.restore();

  // 최고 · 최저 — 가격과 날짜만. % 없음(FR-7)
  const extrema = extremaIndices(series, from, to);
  ctx.fillStyle = CHART_THEME.text;
  const mark = (i: number, value: number, above: boolean) => {
    const mx = x(i);
    const my = price.toY(value) + (above ? -8 : 8);
    const text = `${formatPrice(value)} (${formatShortDate(series.time[i]!, options.offsetMinutes)})`;
    const w = ctx.measureText(text).width;
    ctx.textAlign = mx + w + 8 > plotWidth ? "right" : "left";
    ctx.fillStyle = above ? CHART_THEME.up : CHART_THEME.down;
    ctx.fillText(text, ctx.textAlign === "right" ? mx - 4 : mx + 4, my);
  };
  mark(extrema.high, series.high[extrema.high]!, true);
  mark(extrema.low, series.low[extrema.low]!, false);
  ctx.textAlign = "left";

  // 가격선 — 범위 안이면 선, 밖이면 가장자리 표시(FR-8)
  const edgeMarks: Array<{ y: number; text: string; color: string; up: boolean }> = [];
  for (const line of options.priceLines) {
    const color = lineColor(line.tone);
    const y = price.toY(line.price);
    if (line.price > extent.max || line.price < extent.min) {
      const up = line.price > extent.max;
      edgeMarks.push({
        y: up ? priceTop + EDGE_ROW / 2 : priceBottom - EDGE_ROW / 2,
        text: `${up ? "▲" : "▼"} ${line.label} ${formatPrice(line.price)}`,
        color,
        up,
      });
      continue;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.setLineDash(line.dashed ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(0, crisp(y));
    ctx.lineTo(plotWidth, crisp(y));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // 구간 이름표 — 캔들 **위**, 띠 왼쪽 위 안쪽. 띠가 얇으면 띠 바로 위(자리가 없으면 아래)
  if (band && bandRect) {
    const text = band.label;
    const chipW = ctx.measureText(text).width + 16;
    const inside = bandRect.bottom - bandRect.top >= ZONE_CHIP_HEIGHT + ZONE_CHIP_INSET * 2;
    let chipTop = inside ? bandRect.top + ZONE_CHIP_INSET : bandRect.top - ZONE_CHIP_HEIGHT - 3;
    if (chipTop < scaleTop) chipTop = bandRect.bottom + 3;
    // 흰 바탕 위에 옅은 액센트 — 캔들 위에서도 글자가 읽힌다
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(ZONE_CHIP_INSET, chipTop, chipW, ZONE_CHIP_HEIGHT, 4);
    else ctx.rect(ZONE_CHIP_INSET, chipTop, chipW, ZONE_CHIP_HEIGHT);
    ctx.fillStyle = CHART_THEME.badgeText;
    ctx.fill();
    ctx.fillStyle = CHART_THEME.zoneChipBg;
    ctx.fill();
    ctx.font = CHART_THEME.fontBold;
    ctx.fillStyle = CHART_THEME.zoneChipText;
    ctx.fillText(text, ZONE_CHIP_INSET + 8, chipTop + ZONE_CHIP_HEIGHT / 2);
    ctx.font = CHART_THEME.font;
  }

  // 가장자리 표시 — **왼쪽**에 흰 바탕으로 쌓는다. 오른쪽은 최근 봉 · 최고가 표시와 겹친다(2026-09-22 실측)
  let upStack = 0;
  let downStack = 0;
  for (const edge of edgeMarks) {
    const y = edge.up ? edge.y + upStack * EDGE_ROW : edge.y - downStack * EDGE_ROW;
    if (edge.up) upStack += 1;
    else downStack += 1;
    const w = ctx.measureText(edge.text).width + 8;
    ctx.fillStyle = CHART_THEME.edgeMarkBg;
    ctx.fillRect(4, y - EDGE_ROW / 2 + 1, w, EDGE_ROW - 2);
    ctx.fillStyle = edge.color;
    ctx.fillText(edge.text, 8, y);
  }

  // 현재가 점선
  const last = n - 1;
  const lastColor =
    series.close[last]! > series.open[last]! ? CHART_THEME.up : series.close[last]! < series.open[last]! ? CHART_THEME.down : CHART_THEME.flat;
  const lastY = price.toY(series.close[last]!);
  ctx.strokeStyle = lastColor;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(0, crisp(lastY));
  ctx.lineTo(plotWidth, crisp(lastY));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore(); // clip 해제

  // ── 축 라벨
  ctx.fillStyle = CHART_THEME.axisText;
  ctx.textAlign = "left";
  for (const tick of priceTicks) {
    const y = price.toY(tick);
    if (y < priceTop + 6 || y > priceBottom - 6) continue;
    ctx.fillText(tick.toLocaleString("ko-KR", { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals }), plotWidth + 6, y);
  }
  if (maxVolume > 0) {
    ctx.fillText(formatCompact(maxVolume), plotWidth + 6, volumeTop + 8);
  }
  ctx.textAlign = "center";
  for (const tick of timeTicks) {
    const tx = x(tick.index);
    if (tx < 16 || tx > plotWidth - 16) continue;
    ctx.font = tick.major ? CHART_THEME.fontBold : CHART_THEME.font;
    ctx.fillStyle = tick.major ? CHART_THEME.text : CHART_THEME.axisText;
    ctx.fillText(tick.label, tx, timeAxisTop + CHART_LAYOUT.timeAxisHeight / 2);
  }
  ctx.font = CHART_THEME.font;
  ctx.textAlign = "left";

  // 가격축 배지 — 가격선(범위 안) · 현재가. 현재가를 마지막에 그려 위에 온다
  for (const line of options.priceLines) {
    if (line.price > extent.max || line.price < extent.min) continue;
    const y = price.toY(line.price);
    const color = lineColor(line.tone);
    badge(ctx, formatPrice(line.price), plotWidth + 1, y, color, CHART_THEME.badgeText);
  }
  if (lastY >= priceTop && lastY <= priceBottom) {
    badge(ctx, formatPrice(series.close[last]!), plotWidth + 1, lastY, lastColor, CHART_THEME.badgeText);
  }

  return { price, volume, priceDecimals, range };
};
