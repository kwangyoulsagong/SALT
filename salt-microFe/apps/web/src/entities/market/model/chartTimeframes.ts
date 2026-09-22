/**
 * 상세 분석 차트의 기간 탭 (`FE-REQ-026` FR-132).
 *
 * REQ 는 6개(1분 · 5분 · 15분 · 1시간 · 1일 · 1주)다. **1주가 없는 이유:** 서버 차트가
 * `minute`(1·3·5·15·30·60·240) · `day` 만 준다(`investment.routes.ts`). BFF 도 모르는
 * `period` 를 422 로 거부한다. 서버에 `week` 가 생기면 여기에 한 줄 더한다.
 *
 * `value` 는 `PreviewChart` 의 `timeframe` 이기도 하다(축 라벨이 일봉이면 날짜).
 */
import { Timeframe } from "@/shared/api";

export type ChartTimeframe = "1m" | "5m" | "15m" | "1h" | "1d";

export interface ChartTimeframeSpec {
  value: ChartTimeframe;
  period: "minute" | "day";
  /** 분봉 단위. 일봉은 서버가 무시한다 */
  unit: number;
  /**
   * 실시간 봉 주기. BFF WS 는 1분 · 5분 · 1시간만 만든다(`candleBuilder`) — 나머지는 조회로만 갱신하고
   * 화면이 "실시간 아님"을 알린다(`FE-REQ-034` FR-64)
   */
  realtime: Timeframe | null;
}

export const CHART_TIMEFRAMES: readonly ChartTimeframeSpec[] = [
  { value: "1m", period: "minute", unit: 1, realtime: Timeframe.OneMinute },
  { value: "5m", period: "minute", unit: 5, realtime: Timeframe.FiveMinutes },
  { value: "15m", period: "minute", unit: 15, realtime: null },
  { value: "1h", period: "minute", unit: 60, realtime: Timeframe.OneHour },
  { value: "1d", period: "day", unit: 1, realtime: null },
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
