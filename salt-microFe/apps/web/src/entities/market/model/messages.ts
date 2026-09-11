/** 시세 슬라이스의 사용자 노출 문구. 컴포넌트에 하드코딩하지 않는다 (`i18n-policy.md`). */
export const MARKET_MESSAGES = {
  realtimeAsOf: "실시간 오늘 19:30 기준",
  loading: "실시간 투자 정보를 불러오는 중입니다.",
  loadFailed: "실시간 투자 정보를 불러오지 못했습니다.",
  previewLoading: " 로딩중",
  chartHeading: "실시간 차트 (5분 봉)",
  sentimentHeading: "시장 심리 온도계",
  smartMoneyHeading: "스마트 머니 추적",
  newsHeading: "뉴스",
  largeBuys: "대량 매수",
  largeSells: "대량 매도",
  orderbookRatio: "호가창 매수/매도 비율",
  newsImageAlt: (symbol: string) => `${symbol} 뉴스 이미지`,
} as const;

/** 테이블 헤더 5컬럼도 변경 금지 목록이다 (`FE-REQ-009` FR-36). */
export const MARKET_TABLE_HEADERS = [
  { id: "currentPrice", value: "현재가" },
  { id: "changeRate", value: "변동률" },
  { id: "highPrice", value: "최고가" },
  { id: "lowPrice", value: "최저가" },
  { id: "trade_value", value: "거래대금" },
] as const;
