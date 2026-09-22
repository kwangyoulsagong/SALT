"use client";

// 클라이언트 잎: 기간 탭 상태 · 실시간 구독. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FilterTabs } from "@repo/ui/filterTabs";
import { Skeleton } from "@repo/ui/skeleton";
import { Text } from "@repo/ui/text";
import type {
  TradingCandle,
  TradingChart as TradingChartComponent,
  TradingPriceLine,
} from "@repo/ui/tradingChart";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { useMarketChart } from "../api";
import { candleTimeMs, useMarketChartRealtime } from "../lib";
import {
  CHART_TIMEFRAMES,
  type ChartTimeframe,
  chartTimeframeSpec,
  DEFAULT_CHART_TIMEFRAME,
  MARKET_MESSAGES,
} from "../model";
import {
  chartFallback,
  DETAIL_CHART_HEIGHT,
  detailChart,
  detailChartMeasure,
  LEGEND_HEIGHT,
  legendNote,
} from "./MarketDetailChart.css";

/**
 * 차트 엔진은 **지연 청크**다. 이 파일은 `@/entities/market` barrel 로 투자 화면 패널 청크에도
 * 딸려 가는데(슬라이스 6 회고 — barrel 비용), 정적으로 부르면 캔버스 엔진까지 따라간다.
 *
 * ## `next/dynamic` 이 아니다
 *
 * `next/dynamic` 은 Suspense 로 동작하고, React 18 은 대체 화면을 걷을 때 **최대 300ms 를 몰아서
 * 기다린다.** 청크를 조회와 동시에 받아 둬도 응답 뒤 그리기가 p95 337ms 늦었다(프로덕션 실측). 청크를
 * 마운트 때 직접 받아 상태로 들고, 데이터와 청크가 둘 다 있을 때 그린다 — 기다림이 없다.
 */
const loadTradingChart = () => import("@repo/ui/tradingChart").then((mod) => mod.TradingChart);

const TIMEFRAME_OPTIONS = CHART_TIMEFRAMES.map((spec) => ({
  value: spec.value,
  label: MARKET_MESSAGES.chartTimeframes[spec.value],
}));

interface MarketDetailChartProps {
  symbol: string;
  /** 스크린리더 이름 — 종목 표시 이름 */
  displayName: string;
  /**
   * 가격선. **시세 슬라이스는 이 선이 무엇인지 모른다** — 코치 구간(`zone`)을 선으로 바꾸는 것은 위
   * 레이어가 한다(같은 레이어 cross-slice 를 피하는 슬롯, `MarketPreview` `coachSlot` 과 같다).
   */
  priceLines?: readonly TradingPriceLine[];
  /** 선 범례(예측 아님 배지 포함). 위와 같은 이유로 자리만 낸다 */
  legend?: ReactNode;
}

/**
 * 상세 분석 차트 (`FE-REQ-034`) — 기간 탭 + 자체 구현 캔버스 차트 + 실시간 봉.
 *
 * 투자 화면 우측 패널은 여전히 `PreviewChart` 다. 이 차트는 상세 페이지만 쓴다.
 * 기간 탭은 URL 에 두지 않는다(공유할 화면이 없다). 기간을 바꾸면 뷰포트를 기본으로 되돌린다(FR-27).
 */
export const MarketDetailChart = ({
  symbol,
  displayName,
  priceLines,
  legend,
}: MarketDetailChartProps) => {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>(DEFAULT_CHART_TIMEFRAME);

  // 엔진 청크를 **조회와 동시에** 받는다
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
  const spec = chartTimeframeSpec(timeframe);
  const { data, isLoading, isError, isPlaceholderData } = useMarketChart(symbol, timeframe);
  useMarketChartRealtime(symbol, timeframe, spec.realtime);

  // 조회 봉 → 차트 봉. 시각은 KST 로 못박아 파싱한다(FR-61)
  const candles = useMemo<TradingCandle[]>(
    () =>
      (data?.data ?? []).map((item) => ({
        time: candleTimeMs(item.timestamp),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      })),
    [data],
  );

  const aside = isPlaceholderData ? (
    <span className={legendNote}>{MARKET_MESSAGES.chartLoading}</span>
  ) : spec.realtime === null ? (
    <span className={legendNote}>{MARKET_MESSAGES.chartNotRealtime}</span>
  ) : null;

  return (
    <div className={detailChart}>
      <FilterTabs
        options={TIMEFRAME_OPTIONS}
        value={timeframe}
        onChange={(next) => setTimeframe(next as ChartTimeframe)}
        label={MARKET_MESSAGES.chartTimeframeGroupLabel}
      />
      <div className={detailChartMeasure}>
        {isLoading || (!isError && data && !TradingChart) ? (
          <Skeleton height={DETAIL_CHART_HEIGHT + LEGEND_HEIGHT} />
        ) : isError || !data || !TradingChart ? (
          <div className={chartFallback}>
            <Text color="tertiary">{MARKET_MESSAGES.chartUnavailable}</Text>
          </div>
        ) : (
          <TradingChart
            candles={candles}
            height={DETAIL_CHART_HEIGHT}
            intraday={spec.period === "minute"}
            name={MARKET_MESSAGES.chartName(displayName, MARKET_MESSAGES.chartTimeframes[timeframe])}
            priceLines={priceLines}
            resetKey={timeframe}
            legendAside={aside}
          />
        )}
      </div>
      {legend}
    </div>
  );
};

export default MarketDetailChart;
