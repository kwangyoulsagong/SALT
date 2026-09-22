"use client";

// 클라이언트 잎: 기간 탭 상태 · 폭 측정. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FilterTabs } from "@repo/ui/filterTabs";
import { PreviewChart, type PriceLine } from "@repo/ui/previewChart";
import { Skeleton } from "@repo/ui/skeleton";
import { Text } from "@repo/ui/text";
import { type ReactNode, useState } from "react";

import { useElementWidth } from "@/shared/lib";

import { useMarketChart } from "../api";
import {
  CHART_TIMEFRAMES,
  type ChartTimeframe,
  DEFAULT_CHART_TIMEFRAME,
  MARKET_MESSAGES,
} from "../model";
import { detailChart, detailChartMeasure } from "./MarketDetailChart.css";

/** 상세 차트 높이. 자리표시자도 같은 높이다(`performance-frontend.md` §4) */
const DETAIL_CHART_HEIGHT = 320;
const DETAIL_CHART_FALLBACK_WIDTH = 640;

const TIMEFRAME_OPTIONS = CHART_TIMEFRAMES.map((spec) => ({
  value: spec.value,
  label: MARKET_MESSAGES.chartTimeframes[spec.value],
}));

interface MarketDetailChartProps {
  symbol: string;
  /**
   * 캔들 위 수평선. **시세 슬라이스는 이 선이 무엇인지 모른다** — 코치 구간(`zone`)을 선으로
   * 바꾸는 것은 위 레이어가 한다(`FE-REQ-026` FR-132). 같은 레이어 cross-slice 를 피하는
   * 슬롯이고, `MarketPreview` 의 `coachSlot` 과 같은 방식이다.
   */
  priceLines?: readonly PriceLine[];
  /** 선 범례. 위와 같은 이유로 자리만 낸다 */
  legend?: ReactNode;
}

/**
 * 상세 분석 차트 — 기간 탭 + 캔들 + 가격선 (`FE-REQ-026` FR-132 · `FE-REQ-029` FR-73).
 *
 * 차트 라이브러리를 더하지 않는다 — 프리뷰와 같은 `PreviewChart`(visx)다.
 * 기간 탭은 URL 에 두지 않는다. 모드와 달리 공유할 화면이 없다.
 */
export const MarketDetailChart = ({
  symbol,
  priceLines,
  legend,
}: MarketDetailChartProps) => {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>(DEFAULT_CHART_TIMEFRAME);
  const { data, isLoading, isError } = useMarketChart(symbol, timeframe);
  const [containerRef, width] = useElementWidth<HTMLDivElement>(
    DETAIL_CHART_FALLBACK_WIDTH,
  );

  return (
    <div className={detailChart}>
      <FilterTabs
        options={TIMEFRAME_OPTIONS}
        value={timeframe}
        onChange={(next) => setTimeframe(next as ChartTimeframe)}
        label={MARKET_MESSAGES.chartTimeframeGroupLabel}
      />
      <div ref={containerRef} className={detailChartMeasure}>
        {isLoading ? (
          <Skeleton height={DETAIL_CHART_HEIGHT} />
        ) : isError || !data ? (
          <Text color="tertiary">{MARKET_MESSAGES.chartUnavailable}</Text>
        ) : (
          <PreviewChart
            symbol={symbol}
            timeframe={timeframe}
            data={data.data}
            width={width}
            height={DETAIL_CHART_HEIGHT}
            priceLines={priceLines}
          />
        )}
      </div>
      {legend}
    </div>
  );
};

export default MarketDetailChart;
