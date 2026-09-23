export const INVESTMENT_DETAIL_PAGE_MESSAGES = {
  blockName: "상세 분석",
  back: "투자로 돌아가기",

  /** 요약 지표 (`FE-REQ-026` FR-131 헤더). 값은 전부 서버가 준 것이다. */
  statRange: "24시간 범위",
  statTradeValue: "거래대금",
  statSentiment: "심리 온도",
  statUpdatedAt: "시세 기준",

  /** 메타데이터 — 검색 결과 · 공유 미리보기. 예측 · 확신 표현을 쓰지 않는다 */
  metaTitle: (name: string, symbol: string) => `${name}(${symbol}) 시세 · 차트 · AI 코치 판단`,
  metaTitleFallback: (symbol: string) => `${symbol} 시세 · 차트 · AI 코치 판단`,
  metaDescription: (name: string, price: string, change: string) =>
    `${name} 현재가 ${price}원, 24시간 ${change}. 과거 적중률과 틀렸던 사례까지 함께 보는 AI 코치 판단과 내 규칙 기반 가격 — 예측이 아닙니다.`,
  metaDescriptionFallback: (symbol: string) =>
    `${symbol} 차트와 과거 적중률 · 틀렸던 사례까지 함께 보는 AI 코치 판단 — 예측이 아닙니다.`,
  breadcrumbInvestments: "코인 시세",
} as const;

/** 본문 자리 높이 — Hero + 차트(320) + 탭 · 여백. 도착 전 푸터가 올라붙지 않게 */
export const INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT = 640;
