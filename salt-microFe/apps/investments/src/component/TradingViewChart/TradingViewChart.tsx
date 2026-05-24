"use client";
import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  LineStyle,
  CrosshairMode,
  createChart,
  UTCTimestamp,
} from "lightweight-charts";
import { MarketChartPreviewResponse } from "@/api/investments/investments";

interface TradingViewChartProps {
  symbol: string;
  data: MarketChartPreviewResponse;
}

const TradingViewChart = ({ symbol, data }: TradingViewChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#9ca3af",
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        vertLines: { color: "#f3f4f6", style: LineStyle.Solid },
        horzLines: { color: "#f3f4f6", style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          visible: true,
          color: "#e5e7eb",
          style: LineStyle.Solid,
          width: 1,
        },
        horzLine: {
          visible: true,
          color: "#e5e7eb",
          style: LineStyle.Solid,
          width: 1,
        },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#ff4b48",
      downColor: "#1f74ff",
      borderVisible: false,
      wickUpColor: "#ff4b48",
      wickDownColor: "#1f74ff",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      color: "#e5e7eb",
    });

    const raw = data.data ?? [];
    const sortedRaw = raw
      .filter((c) => c?.timestamp && !isNaN(new Date(c.timestamp).getTime()))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    const parseTimestamp = (ts: string) =>
      Math.floor(new Date(ts + "Z").getTime() / 1000) as UTCTimestamp;
    const candles = sortedRaw.map((c) => ({
      time: parseTimestamp(c.timestamp),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumes = sortedRaw.map((c) => ({
      time: parseTimestamp(c.timestamp),
      value: c.volume,
    }));

    candleSeries.setData(candles);
    volumeSeries.setData(volumes);
    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [symbol, data]);

  return <div ref={chartContainerRef} style={{ width: "100%", height: 260 }} />;
};

export default TradingViewChart;
