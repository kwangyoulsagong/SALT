/** 시세 슬라이스가 소유하는 쿼리 키. 슬라이스 밖에서 만들지 않는다. */
export const marketQueryKeys = {
  overview: ["MarketOverview"] as const,
  chartPreview: ["MarketChartPreview"] as const,
  intelligencePreview: ["MarketIntelligencePreview"] as const,
} as const;
