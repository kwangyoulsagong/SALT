import React, {
  MouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { Line, Bar } from "@visx/shape";
import { previewChartWrapper, tooltipBase } from "./styles/previewChart.css";
import { vars } from "../styles/tokens.css";
import { FlexBox } from "../FlexBox/FlexBox";
import { Margin } from "../Margin/Margin";
import { Text } from "../Typo/Text/Text";
type Timeframe = "1m" | "5m" | "15m" | "1h" | "1d";
export interface MarketChartPreviewItem {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 캔들 위에 긋는 수평 가격선. 가격은 **부르는 쪽이 준 값 그대로**다 — 차트는 계산하지 않는다.
 *
 * `tone` 은 색의 뜻이다. `down` = 하락 색(손실 제한처럼 아래로 깨지는 선), `neutral` = 회색.
 * 상승 빨강 · 하락 파랑 규칙을 뒤집는 색을 받지 않으려고 hex 가 아니라 이름만 받는다.
 */
export interface PriceLine {
  key: string;
  price: number;
  /** `zone` = 가격 구간(`PriceBand`)의 경계 · 중앙 — 띠와 같은 색 */
  tone: "down" | "neutral" | "zone";
  dashed: boolean;
  /** 범례용 이름. 선 옆에는 그리지 않는다 — 범례는 부르는 쪽이 그린다 */
  label: string;
}

/** 옅게 칠할 가격 구간 + 이름표. 경계선은 `priceLines` 가 긋는다. 값 · 문구는 부르는 쪽 그대로 */
export interface PriceBand {
  lower: number;
  upper: number;
  label: string;
}

export interface PreviewChartProps {
  symbol: string;
  timeframe?: Timeframe;
  data: MarketChartPreviewItem[];
  width?: number;
  height?: number;
  priceLines?: readonly PriceLine[];
  priceBand?: PriceBand | null;
}

const PRICE_LINE_COLOR: Record<PriceLine["tone"], string> = {
  down: vars.colors.special.down,
  neutral: vars.colors.neutral[500],
  zone: vars.colors.ai.primary,
};
const BAND_FILL_OPACITY = 0.09;
const BAND_CHIP_OPACITY = 0.16;
const BAND_CHIP_HEIGHT = 18;
const BAND_CHIP_INSET = 5;
const BAND_CHIP_FONT_SIZE = 11;

/** SVG 는 글자 폭을 재기 전에 그려야 한다 — 한글은 글자 크기만큼, 나머지는 0.6배로 어림한다 */
const estimateTextWidth = (text: string, fontSize: number) => {
  let w = 0;
  for (const ch of text) w += /[\u3131-\uD79D]/.test(ch) ? fontSize : fontSize * 0.6;
  return w;
};
const PRICE_LINE_DASH = "4 3";
const NO_PRICE_LINES: readonly PriceLine[] = [];

/**
 * y 범위 = 캔들 고가 · 저가 **만**. 가격선 · 구간은 범위를 넓히지 않는다 — 넣으면 현재가에서 먼 구간
 * (1년 하위 20% 등)이 2.5시간 캔들을 한 줄로 납작하게 만든다(`FE-REQ-034` 문제 3, 상세 차트와 같은 규칙).
 * 범위 밖 선은 그리지 않고, 구간은 이름표가 가장자리에 ▲▼ 로 남는다(`FE-REQ-036` FR-4).
 */
const getMinYAndMaxY = (
  candles: MarketChartPreviewItem[]
): [number, number] => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const c of candles) {
    if (c.low < min) min = c.low;
    if (c.high > max) max = c.high;
  }
  if (min === max) {
    min = min - 1;
    max = max + 1;
  }
  return [min, max];
};
export const PreviewChart = React.memo(
  ({
    symbol,
    data,
    timeframe = "5m",
    width = 447,
    height = 210,
    priceLines = NO_PRICE_LINES,
    priceBand = null,
  }: PreviewChartProps) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState<boolean>(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const rafRef = useRef<number | null>(null);
    const candles = data;
    const [minY, maxY] = useMemo(
      () => getMinYAndMaxY(candles),
      [candles]
    );
    const xScale = useMemo(
      () =>
        scaleBand<number>({
          domain: candles.map((_, c) => c),
          range: [4, width - 4],
          padding: 0.2,
        }),
      [candles, width]
    );
    const axisHeight = 18;
    const volumeHeight = height * 0.15;
    const candleHeight = height - axisHeight - volumeHeight;
    const yScale = useMemo(
      () =>
        scaleLinear<number>({
          domain: [minY, maxY],
          range: [candleHeight - 4, 4],
          nice: true,
        }),
      [minY, maxY, candleHeight]
    );

    const maxVolume = candles.length
      ? candles.reduce((max, c) => (c.volume > max ? c.volume : max), 0)
      : 0;

    const yVolumeScale = useMemo(
      () =>
        scaleLinear<number>({
          domain: [0, maxVolume],
          range: [volumeHeight - 2, 2],
          nice: true,
        }),
      [maxVolume, volumeHeight]
    );

    // 캔들 고가/저가(minY~maxY)를 기준으로
    // 값을 균등하게 4등분하여 3개의 그리드 라인 Y값을 계산한다.
    const gridXYValue = useMemo(() => {
      const steps = 3;
      const step = (maxY - minY) / (steps + 1);
      return new Array(steps).fill(0).map((_, i) => minY + (i + 1) * step);
    }, [minY, maxY]);

    // 일봉은 시각이 늘 같다(09:00) — 날짜를 보여 준다
    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);

      if (timeframe === "1d") {
        return date.toLocaleDateString("ko-KR", {
          month: "2-digit",
          day: "2-digit",
        });
      }
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    };
    const timeLabels: { candle: MarketChartPreviewItem; idx: number }[] =
      useMemo(() => {
        if (candles.length === 0) return [];

        const mid = Math.floor(candles.length / 2);

        return [
          { candle: candles[0]!, idx: 0 },
          { candle: candles[mid]!, idx: mid },
          { candle: candles[candles.length - 1]!, idx: candles.length - 1 },
        ];
      }, [candles]);

    const labelPadding = 20; // 왼쪽/오른쪽 여유

    const handleMouseMove = useCallback(
      (e: MouseEvent<SVGRectElement>) => {
        if (!svgRef.current || candles.length === 0) return;
        if (rafRef.current != null) return;
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          const rangeStart = 4;
          const rangeEnd = width - 4;
          const clampedX = Math.max(rangeStart, Math.min(rangeEnd, mouseX));
          // band scale 의 step 이용해서 index 역산
          const step = xScale.step();
          let idx = Math.floor((clampedX - rangeStart) / step);
          idx = Math.max(0, Math.min(candles.length - 1, idx));
          setHoverIndex(idx);
          setIsHovering(true);
        });
      },
      [candles.length, width, xScale]
    );

    const handleMouseLeave = useCallback(() => {
      setIsHovering(false);
      setHoverIndex(null);
    }, []);

    const hoveredCandle = hoverIndex !== null ? candles[hoverIndex] : null;

    const hoveredXCenter =
      hoverIndex != null
        ? (xScale(hoverIndex) ?? 0) + xScale.bandwidth() / 2
        : null;

    const tooltipSide =
      hoveredXCenter != null && hoveredXCenter < width / 2 ? "right" : "left";

    // 띠는 캔들 창 안으로 자른다. 띠가 얇으면 이름표는 띠 위(자리가 없으면 아래), 창 밖이면 가장자리에 ▲▼
    const bandGeometry = useMemo(() => {
      if (!priceBand) return null;
      const paneTop = 2;
      const paneBottom = candleHeight - 2;
      const rawTop = yScale(priceBand.upper);
      const rawBottom = yScale(priceBand.lower);
      const above = rawBottom < paneTop;
      const below = rawTop > paneBottom;
      const top = Math.max(rawTop, paneTop);
      const bottom = Math.min(rawBottom, paneBottom);
      const label = above
        ? `▲ ${priceBand.label}`
        : below
          ? `▼ ${priceBand.label}`
          : priceBand.label;
      let chipTop: number;
      if (above) chipTop = paneTop;
      else if (below) chipTop = paneBottom - BAND_CHIP_HEIGHT;
      else if (bottom - top >= BAND_CHIP_HEIGHT + BAND_CHIP_INSET * 2) chipTop = top + BAND_CHIP_INSET;
      else {
        chipTop = top - BAND_CHIP_HEIGHT - 3;
        if (chipTop < paneTop) chipTop = bottom + 3;
      }
      return {
        top,
        height: above || below ? 0 : Math.max(bottom - top, 0),
        chipTop,
        label,
        chipWidth: estimateTextWidth(label, BAND_CHIP_FONT_SIZE) + 14,
      };
    }, [priceBand, yScale, candleHeight]);

    return (
      <div className={previewChartWrapper} style={{ width, height }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          role="img"
          aria-label={`${symbol} ${timeframe} 봉 미리보기 차트`}
        >
          <title>{`${symbol} ${timeframe} 봉 미리보기 차트`}</title>
          <Group>
            {/* 수평 그리드 라인 (연한 회색) */}
            {gridXYValue.map((v, idx) => {
              const y = yScale(v);
              return (
                <Line
                  key={idx}
                  from={{ x: 0, y }}
                  to={{ x: width, y }}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
              );
            })}
            {/* 세로 가이드 라인 (crosshair) */}
            {isHovering && hoveredXCenter != null && (
              <Line
                from={{ x: hoveredXCenter, y: 4 }}
                to={{ x: hoveredXCenter, y: candleHeight }}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}
            {bandGeometry && bandGeometry.height > 0 && (
              <rect
                x={0}
                y={bandGeometry.top}
                width={width}
                height={bandGeometry.height}
                fill={PRICE_LINE_COLOR.zone}
                fillOpacity={BAND_FILL_OPACITY}
                pointerEvents="none"
              />
            )}
            {priceLines.map((line) => {
              if (line.price < minY || line.price > maxY) return null;
              const y = yScale(line.price);
              return (
                <Line
                  key={`price-line-${line.key}`}
                  from={{ x: 0, y }}
                  to={{ x: width, y }}
                  stroke={PRICE_LINE_COLOR[line.tone]}
                  strokeWidth={1.5}
                  strokeDasharray={line.dashed ? PRICE_LINE_DASH : undefined}
                />
              );
            })}
            {candles.map((c, idx) => {
              const xCenter =
                (xScale(idx) ?? 0) + (xScale.bandwidth() / 2 || 0);
              const candleWidth = Math.max(xScale.bandwidth() * 0.8, 2);
              const openY = yScale(c.open);
              const closeY = yScale(c.close);
              const highY = yScale(c.high);
              const lowY = yScale(c.low);

              const isUp = c.close > c.open;
              const isDown = c.close < c.open;

              const color = isUp
                ? `${vars.colors.special.up}`
                : isDown
                ? `${vars.colors.special.down}`
                : "#9ca3af";

              const bodyTop = Math.min(openY, closeY);
              const bodyBottom = Math.max(openY, closeY);
              const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

              return (
                <Group key={`${c.timestamp}-${idx}`}>
                  {/* wick */}
                  <Line
                    from={{ x: xCenter, y: highY }}
                    to={{ x: xCenter, y: lowY }}
                    stroke={color}
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                  {/* Body */}
                  <Bar
                    x={xCenter - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    rx={1}
                    ry={1}
                  />
                </Group>
              );
            })}
          </Group>
          {/* volume bar */}
          {/* 구간 이름표 — 캔들 **위**에 온다(SVG 는 나중에 그린 것이 위) */}
          {priceBand && bandGeometry && (
            <g pointerEvents="none">
              <rect
                x={BAND_CHIP_INSET}
                y={bandGeometry.chipTop}
                width={bandGeometry.chipWidth}
                height={BAND_CHIP_HEIGHT}
                rx={4}
                fill={vars.colors.background.white}
              />
              <rect
                x={BAND_CHIP_INSET}
                y={bandGeometry.chipTop}
                width={bandGeometry.chipWidth}
                height={BAND_CHIP_HEIGHT}
                rx={4}
                fill={PRICE_LINE_COLOR.zone}
                fillOpacity={BAND_CHIP_OPACITY}
              />
              <text
                x={BAND_CHIP_INSET + 7}
                y={bandGeometry.chipTop + BAND_CHIP_HEIGHT / 2}
                dominantBaseline="central"
                fontSize={BAND_CHIP_FONT_SIZE}
                fontWeight={600}
                fill={vars.colors.neutral[800]}
              >
                {bandGeometry.label}
              </text>
            </g>
          )}
          <Group top={candleHeight}>
            {candles.map((v, idx) => {
              const xCenter =
                (xScale(idx) ?? 0) + (xScale.bandwidth() / 2 || 0);
              const candleWidth = Math.max(xScale.bandwidth() * 0.8, 2);
              const volHeight = yVolumeScale(v.volume);
              return (
                <Bar
                  key={`vol-${idx}`}
                  x={xCenter - candleWidth / 2}
                  y={volumeHeight - volHeight}
                  width={candleWidth}
                  height={volHeight}
                  fill="#d1d5db"
                  opacity={0.9}
                />
              );
            })}
          </Group>
          {/* timeLabel */}
          <Group top={candleHeight + volumeHeight}>
            {timeLabels.map(({ candle, idx }) => {
              const x = (xScale(idx) ?? 0) + xScale.bandwidth() / 2;
              const paddedX =
                idx === 0
                  ? Math.max(labelPadding, x)
                  : idx === candles.length - 1
                  ? Math.min(width - labelPadding, x)
                  : x;
              return (
                <text
                  key={`time-${idx}`}
                  x={paddedX}
                  y={axisHeight / 2 + 4}
                  textAnchor="middle"
                  style={{ fill: "#9ca3af", fontSize: 11 }}
                >
                  {formatTime(candle.timestamp)}
                </text>
              );
            })}
          </Group>
          {/* mouse event 잡는 오버레이 */}
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </svg>
        {/* Tooltip 카드 (HTML) */}
        {hoveredCandle && hoveredXCenter != null && (
          <div
            className={tooltipBase}
            style={{
              left: hoveredXCenter,
              top: candleHeight * 0.3,
              opacity: isHovering ? 1 : 0,
              transform:
                tooltipSide === "right"
                  ? "translateX(12px)"
                  : "translateX(calc(-100% - 12px))",
            }}
          >
            <FlexBox>
              <Margin bottom="sm">
                <Text variant="body">
                  {new Date(hoveredCandle.timestamp).toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Margin>
            </FlexBox>
            <FlexBox direction="column" gap="xs">
              <FlexBox gap="xs" align="center">
                <Text variant="body" color="tertiary">
                  시작
                </Text>
                <Text variant="body">
                  {hoveredCandle.open.toLocaleString("ko-KR")}
                </Text>
              </FlexBox>
              <FlexBox gap="xs" align="center">
                <Text variant="body" color="tertiary">
                  마지막
                </Text>
                <Text variant="body">
                  {hoveredCandle.close.toLocaleString("ko-KR")}
                </Text>
              </FlexBox>
              <FlexBox gap="xs" align="center">
                <Text variant="body" color="tertiary">
                  최고
                </Text>
                <Text variant="body">
                  {hoveredCandle.high.toLocaleString("ko-KR")}
                </Text>
              </FlexBox>
              <FlexBox gap="xs" align="center">
                <Text variant="body" color="tertiary">
                  최저
                </Text>
                <Text variant="body">
                  {hoveredCandle.low.toLocaleString("ko-KR")}
                </Text>
              </FlexBox>
              <FlexBox gap="xs" align="center">
                <Text variant="body" color="tertiary">
                  거래량
                </Text>
                <Text variant="body">
                  {hoveredCandle.volume.toLocaleString("ko-KR")}
                </Text>
              </FlexBox>
            </FlexBox>
          </div>
        )}
      </div>
    );
  }
);

PreviewChart.displayName = "PreviewChart";
