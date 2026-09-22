/**
 * 상세 분석 차트의 기간 탭 (`FE-REQ-026` FR-132).
 *
 * REQ 는 6개(1분 · 5분 · 15분 · 1시간 · 1일 · 1주)다. **1주가 없는 이유:** 서버 차트가
 * `minute`(1·3·5·15·30·60·240) · `day` 만 준다(`investment.routes.ts`). BFF 도 모르는
 * `period` 를 422 로 거부한다. 서버에 `week` 가 생기면 여기에 한 줄 더한다.
 *
 * `value` 는 `PreviewChart` 의 `timeframe` 이기도 하다(축 라벨이 일봉이면 날짜).
 */
export type ChartTimeframe = "1m" | "5m" | "15m" | "1h" | "1d";

export interface ChartTimeframeSpec {
  value: ChartTimeframe;
  period: "minute" | "day";
  /** 분봉 단위. 일봉은 서버가 무시한다 */
  unit: number;
}

export const CHART_TIMEFRAMES: readonly ChartTimeframeSpec[] = [
  { value: "1m", period: "minute", unit: 1 },
  { value: "5m", period: "minute", unit: 5 },
  { value: "15m", period: "minute", unit: 15 },
  { value: "1h", period: "minute", unit: 60 },
  { value: "1d", period: "day", unit: 1 },
];

/** 첫 기간 — 패널 프리뷰(5분봉)와 같은 것으로 연다 */
export const DEFAULT_CHART_TIMEFRAME: ChartTimeframe = "5m";

/** 상세 차트 캔들 수. 프리뷰(30)보다 넓은 화면이라 두 배 */
export const DETAIL_CHART_CANDLE_COUNT = 60;
