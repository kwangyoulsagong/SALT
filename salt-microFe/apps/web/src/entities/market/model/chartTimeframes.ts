/**
 * 상세 분석 차트의 기간 탭 (`FE-REQ-026` FR-132).
 *
 * REQ 대로 6개(1분 · 5분 · 15분 · 1시간 · 1일 · 1주)다. 1주는 서버가 `week`(주봉, 월요일 시작)를 열어
 * 2026-10-30 에 더했다 — 그전엔 서버가 `minute` · `day` 만 줘서 5개였다(`FEATURE-004` FR-27).
 *
 * `value` 는 `PreviewChart` 의 `timeframe` 이기도 하다(축 라벨이 일봉이면 날짜).
 */
import { Timeframe } from "@/shared/api";

import { ChartPeriod } from "./types";

export type ChartTimeframe = "1m" | "5m" | "15m" | "1h" | "1d" | "1w";

export interface ChartTimeframeSpec {
  value: ChartTimeframe;
  period: ChartPeriod;
  /** 분봉 단위. 일봉 · 주봉은 서버가 무시한다 */
  unit: number;
  /**
   * 실시간 봉 주기. BFF WS 는 1분 · 5분 · 1시간만 만든다(`candleBuilder`) — 나머지는 조회로만 갱신하고
   * 화면이 "실시간 아님"을 알린다(`FE-REQ-034` FR-64)
   */
  realtime: Timeframe | null;
}

export const CHART_TIMEFRAMES: readonly ChartTimeframeSpec[] = [
  { value: "1m", period: ChartPeriod.Minute, unit: 1, realtime: Timeframe.OneMinute },
  { value: "5m", period: ChartPeriod.Minute, unit: 5, realtime: Timeframe.FiveMinutes },
  { value: "15m", period: ChartPeriod.Minute, unit: 15, realtime: null },
  { value: "1h", period: ChartPeriod.Minute, unit: 60, realtime: Timeframe.OneHour },
  { value: "1d", period: ChartPeriod.Day, unit: 1, realtime: null },
  { value: "1w", period: ChartPeriod.Week, unit: 1, realtime: null },
];

/** 첫 기간 — 패널 프리뷰(5분봉)와 같은 것으로 연다 */
export const DEFAULT_CHART_TIMEFRAME: ChartTimeframe = "5m";

/**
 * 상세 차트 봉 수 = **서버 상한 200**(`FE-REQ-034` FR-60). 200 을 넘겨 불러도 200 이 온다.
 * 이동평균 120 은 앞 119 봉이 빈다 — 받아들인다.
 */
export const DETAIL_CHART_CANDLE_COUNT = 200;

export const chartTimeframeSpec = (timeframe: ChartTimeframe): ChartTimeframeSpec =>
  CHART_TIMEFRAMES.find((item) => item.value === timeframe) ?? CHART_TIMEFRAMES[0]!;
