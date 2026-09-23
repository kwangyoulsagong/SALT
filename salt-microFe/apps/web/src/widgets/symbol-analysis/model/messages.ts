/** 상세 분석 페이지 조립 문구 (`FE-REQ-026` L) */
export const SYMBOL_ANALYSIS_MESSAGES = {
  back: "투자로 돌아가기",

  /** 패널 제목. 카드 안에서 가장 큰 것은 내용이어야 하므로 짧게 둔다. */
  chartHeading: "차트 · 구간",
  coachHeading: "코치 판단",
  explainHeading: "해설",
  profitPlanHeading: "수익 플랜",
  zoneHeading: "구간",

  /** 요약 지표 (`FE-REQ-026` FR-131 헤더). 값은 전부 서버가 준 것이다. */
  statRange: "24시간 범위",
  statTradeValue: "거래대금",
  statSentiment: "심리 온도",
  statUpdatedAt: "시세 기준",

  /** 하단 고정 띠. 면책은 서버 문장을 그대로 싣는다. */
  disclaimerLabel: "투자 유의사항",
} as const;
