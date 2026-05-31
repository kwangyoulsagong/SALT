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
type Timeframe = "1m" | "5m" | "1h";
export interface MarketChartPreviewItem {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PreviewChartProps {
  symbol: string;
  timeframe?: Timeframe;
  data: MarketChartPreviewItem[];
  width?: number;
  height?: number;
}

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
  }: PreviewChartProps) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState<boolean>(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const rafRef = useRef<number | null>(null);
    const candles = data;
    const [minY, maxY] = useMemo(() => getMinYAndMaxY(candles), [candles]);
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

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);

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
