import type { TimeTickLabels } from "./engine/time";

/**
 * 차트 기본 문구. 도메인 문구가 아니라 차트 용어다 — 앱이 바꾸려면 `messages` prop 으로 통째로 넘긴다.
 */
export interface TradingChartMessages {
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  volumeAverage: (period: number) => string;
  movingAverage: (period: number) => string;
  toggleAverage: (period: number, visible: boolean) => string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  controlsLabel: string;
  groupLabel: (name: string) => string;
  summary: (args: {
    name: string;
    count: number;
    first: string;
    last: string;
    high: string;
    highAt: string;
    low: string;
    lowAt: string;
    close: string;
  }) => string;
  empty: string;
  timeTicks: TimeTickLabels;
}

export const TRADING_CHART_MESSAGES: TradingChartMessages = {
  open: "시가",
  high: "고가",
  low: "저가",
  close: "종가",
  volume: "거래량",
  volumeAverage: (period) => `평균(${period})`,
  movingAverage: (period) => `${period}`,
  toggleAverage: (period, visible) => `${period}봉 이동평균 ${visible ? "숨기기" : "보이기"}`,
  zoomIn: "확대",
  zoomOut: "축소",
  reset: "처음 보기",
  controlsLabel: "차트 조작",
  groupLabel: (name) =>
    `${name} 차트. 좌우 화살표로 봉 이동, 더하기 빼기로 확대 축소, Home End 로 처음 끝`,
  summary: (a) =>
    `${a.name} ${a.first}부터 ${a.last}까지 ${a.count}개 봉. 최고 ${a.high}(${a.highAt}), 최저 ${a.low}(${a.lowAt}), 마지막 종가 ${a.close}.`,
  empty: "표시할 시세가 없습니다.",
  timeTicks: {
    year: (year) => String(year),
    month: (month) => `${month}월`,
    day: (month, day) => `${month}/${day}`,
    time: (hour, minute) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  },
};
