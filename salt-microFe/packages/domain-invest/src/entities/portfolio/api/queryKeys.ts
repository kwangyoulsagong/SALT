export const portfolioQueryKeys = {
  summary: ["PortfolioSummary"] as const,
  /** 포지션 — 거래 저장 · 수정 · 삭제 뒤 `positionAll` 로 함께 무효화한다(FE FR-83) */
  positionAll: ["Position"] as const,
  positionOverview: ["Position", "overview"] as const,
  positionFlow: (range: string) => ["Position", "flow", range] as const,
} as const;
