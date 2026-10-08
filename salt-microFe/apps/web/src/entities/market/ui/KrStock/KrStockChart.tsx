"use client";

// 클라이언트 잎: 기간 탭 상태 · 차트 엔진 지연 로딩. barrel 로 노출되므로 경계를 스스로 갖는다.
import { candleTimeMs } from "@repo/core/market";
import type { KrChartPeriod } from "@repo/core/marketKr";
import { FilterTabs } from "@repo/ui/filterTabs";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import type { TradingCandle, TradingChart as TradingChartComponent } from "@repo/ui/tradingChart";
import { useEffect, useMemo, useState } from "react";

import { useKrChart } from "../../api/useKrStockQueries";
import { KR_STOCK_MESSAGES as M } from "../../model/krStockMessages";
import {
  chartFallback,
  DETAIL_CHART_HEIGHT,
  detailChart,
  detailChartMeasure,
  LEGEND_HEIGHT,
  legendNote,
} from "../MarketDetailChart.css";

/** 엔진은 지연 청크 — `MarketDetailChart` 와 같은 이유로 `next/dynamic` 이 아니라 effect 안 `import()` */
const loadTradingChart = () => import("@repo/ui/tradingChart").then((mod) => mod.TradingChart);

const PERIODS: readonly KrChartPeriod[] = ["1d", "5m"];
const PERIOD_OPTIONS = PERIODS.map((value) => ({ value, label: M.detail.chartPeriods[value] }));

interface KrStockChartProps {
  code: string;
  displayName: string;
}

/**
 * 국내 주식 상세 차트(F011 FR-46) — 일봉(2년 백필) · 5분봉(실시간 집계부터 누적). 5분봉은 **몇 거래일치인지 숨기지 않는다**.
 * 기본은 일봉 — 5분봉은 쌓이는 중이라 첫 화면이 빈약하다. 실시간 봉 병합은 하지 않는다(5분봉 5분 · 일봉은 장 마감 확정).
 */
export const KrStockChart = ({ code, displayName }: KrStockChartProps) => {
  const [period, setPeriod] = useState<KrChartPeriod>("1d");
  const [TradingChart, setTradingChart] = useState<typeof TradingChartComponent | null>(null);
  useEffect(() => {
    let alive = true;
    void loadTradingChart().then((component) => {
      if (alive) setTradingChart(() => component);
    });
    return () => {
      alive = false;
    };
  }, []);

  const { data, isLoading, isError, isPlaceholderData } = useKrChart(code, period);
  const chart = data?.status === "ok" ? data : null;
  const candles = useMemo<TradingCandle[]>(
    () =>
      (chart?.candles ?? []).map((c) => ({
        time: candleTimeMs(c.timestamp),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
    [chart],
  );

  const note = isPlaceholderData
    ? null
    : chart?.period === "5m"
      ? M.detail.coverage(chart.coverage.tradingDays)
      : chart?.period === "1d"
        ? M.detail.adjusted
        : null;

  return (
    <div className={detailChart}>
      <FilterTabs
        options={PERIOD_OPTIONS}
        value={period}
        onChange={(next) => setPeriod(next as KrChartPeriod)}
        label={M.detail.chartPeriodLabel}
        variant="chip"
      />
      <div className={detailChartMeasure}>
        {isLoading || (chart && !TradingChart) ? (
          <Skeleton height={DETAIL_CHART_HEIGHT + LEGEND_HEIGHT} />
        ) : isError || !chart || !TradingChart ? (
          <div className={chartFallback}>
            <StatusLine kind="error">{M.detail.chartUnavailable}</StatusLine>
          </div>
        ) : candles.length === 0 ? (
          <div className={chartFallback}>
            <StatusLine kind="empty">{M.detail.chartEmpty}</StatusLine>
          </div>
        ) : (
          <TradingChart
            candles={candles}
            height={DETAIL_CHART_HEIGHT}
            intraday={period === "5m"}
            name={M.detail.chartName(displayName, M.detail.chartPeriods[period])}
            resetKey={period}
            legendAside={note ? <span className={legendNote}>{note}</span> : null}
          />
        )}
      </div>
    </div>
  );
};
