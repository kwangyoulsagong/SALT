"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  ColorType,
  UTCTimestamp,
} from "lightweight-charts";
import { wsClient } from "@/libs/webSocketClient/webSocketClient";

interface Props {
  symbol: string;
  timeframe?: "1m" | "5m" | "1h";
}

export default function MarketChart({ symbol, timeframe = "1m" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [loading, setLoading] = useState(true);

  /** 🧱 1) 차트 생성 */
  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#111" },
        textColor: "#fff",
      },
      grid: {
        vertLines: { color: "#222", visible: true },
        horzLines: { color: "#222", visible: true },
      },
    });

    seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: false,
    });

    return () => chartRef.current?.remove();
  }, []);

  /** 📌 2) REST 데이터로 초기 캔들 로드 */
  useEffect(() => {
    if (!seriesRef.current || !symbol) return;
    setLoading(true);

    async function loadInitialCandles() {
      try {
        const res = await fetch(
          `http://localhost:4001/api/investment/crypto/${symbol}/chart?period=day&count=100`
        );
        const json = await res.json();

        const raw = json.data;

        // 🔄 날짜 내림차순 → 오름차순으로 변환
        raw.reverse();

        const formatted = raw.map((c: any) => ({
          time: (new Date(c.date).getTime() / 1000) as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        seriesRef.current!.setData(formatted);
      } catch (e) {
        console.error("Failed to load chart:", e);
      } finally {
        setLoading(false);
      }
    }
    loadInitialCandles();
  }, [symbol]);

  /** 📡 3) 실시간 WebSocket 구독 & 업데이트 */
  useEffect(() => {
    if (!symbol || !seriesRef.current) return;

    console.log("📡 Sending WS candle subscribe:", symbol, timeframe);

    const onCandle = ({ symbol: s, timeframe: tf, candle }: any) => {
      if (s !== symbol || tf !== timeframe) return;
      console.log("🔥 Live candle received:", candle);

      seriesRef.current?.update({
        time: (candle.timestamp / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    };

    wsClient.subscribeCandle(symbol, timeframe, onCandle);

    return () => {
      console.log("❌ Unsubscribe WS candle:", symbol, timeframe);
      wsClient.unsubscribeCandle(symbol, timeframe, onCandle);
    };
  }, [symbol, timeframe]);

  return (
    <div style={{ width: "100%", height: 400, position: "relative" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            color: "#aaa",
            fontSize: 12,
          }}
        >
          Loading chart...
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: 400 }} />
    </div>
  );
}
