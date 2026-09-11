import { MarketOrder, MarketPeriod, MarketSort } from "./types";

/** 필터 3그룹은 변경 금지 목록이다 (`FE-REQ-009` FR-36). 순서·문구를 바꾸지 않는다. */
export const SORT_OPTIONS = [
  { label: "전체", value: MarketSort.All },
  { label: "거래대금", value: MarketSort.TradeValue },
  { label: "변동률", value: MarketSort.Change },
  { label: "가격", value: MarketSort.Price },
  { label: "이름", value: MarketSort.Name },
];

export const ORDER_OPTIONS = [
  { label: "오름차순", value: MarketOrder.Ascending },
  { label: "내림차순", value: MarketOrder.Descending },
];

export const PERIOD_OPTIONS = [
  { label: "실시간", value: MarketPeriod.Realtime },
  { label: "1일", value: MarketPeriod.OneDay },
  { label: "1주일", value: MarketPeriod.OneWeek },
  { label: "1개월", value: MarketPeriod.OneMonth },
  { label: "3개월", value: MarketPeriod.ThreeMonths },
  { label: "6개월", value: MarketPeriod.SixMonths },
  { label: "1년", value: MarketPeriod.OneYear },
];
