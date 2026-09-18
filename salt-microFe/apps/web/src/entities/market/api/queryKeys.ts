/** 시세 슬라이스가 소유하는 쿼리 키. 슬라이스 밖에서 만들지 않는다. */
export const marketQueryKeys = {
  overview: ["MarketOverview"] as const,
  chartPreview: ["MarketChartPreview"] as const,
  intelligencePreview: ["MarketIntelligencePreview"] as const,
  /**
   * 관심 목록. **실시간 탭의 별과 관심 종목 탭이 이 키 하나를 같이 본다** —
   * 그래서 한쪽에서 추가/제거하면 다른 쪽이 따라 바뀐다 (`FE-REQ-010` FR-34).
   * 동기화 코드를 따로 쓰지 않는 것이 목적이다.
   */
  watchlist: ["MarketWatchlist"] as const,
} as const;
