/** 시세 슬라이스의 사용자 노출 문구. 컴포넌트에 하드코딩하지 않는다 (`i18n-policy.md`). */
export const MARKET_MESSAGES = {
  /**
   * 표 헤더의 기준 시각. **하드코딩이었다** — `"실시간 오늘 19:30 기준"` 이 언제나
   * 19:30 을 가리켰다 (`FE-REQ-010` FR-2). 이제 WebSocket 마지막 수신 시각이다.
   */
  realtimeAsOf: (time: string) => `실시간 오늘 ${time} 기준`,
  /** 연결은 됐거나 되는 중이고 아직 한 건도 받지 못했다 */
  realtimeWaiting: "실시간 수신 대기 중",
  /**
   * 연결이 닫혔고 다시 여는 중이다. **기준 시각을 쓰지 않는다** — 마지막 시각을 그대로
   * 두면 사용자는 그것을 지금 값으로 읽는다 (`FE-REQ-011` FR-12). 원래는 이 구분이
   * 없어서 BFF 가 죽어도 헤더는 초록 점과 마지막 시각을 계속 보여줬다.
   */
  realtimeDisconnected: "실시간 연결 끊김 · 재연결 중",
  /** 필터 묶음이 무엇을 고르는지. 화면에 보이지 않고 스크린리더만 읽는다 */
  sortGroupLabel: "정렬 기준",
  orderGroupLabel: "정렬 순서",
  periodGroupLabel: "수익률 기간",
  loading: "실시간 투자 정보를 불러오는 중입니다.",
  loadFailed: "실시간 투자 정보를 불러오지 못했습니다.",
  previewLoading: " 로딩중",
  chartHeading: "실시간 차트 (5분 봉)",
  /** 상세 분석 차트 (`FE-REQ-026` FR-132) */
  detailChartHeading: "차트",
  chartTimeframeGroupLabel: "차트 기간",
  chartTimeframes: {
    "1m": "1분",
    "5m": "5분",
    "15m": "15분",
    "1h": "1시간",
    "1d": "1일",
  },
  chartUnavailable: "차트를 불러올 수 없습니다.",
  sentimentHeading: "시장 심리 온도계",
  smartMoneyHeading: "스마트 머니 추적",
  newsHeading: "뉴스",
  /** 차트·심리·스마트머니는 업비트 소스라 크립토에만 있다 */
  marketDataUnavailable: "이 자산군은 차트와 시장 심리를 아직 제공하지 않습니다.",
  largeBuys: "대량 매수",
  largeSells: "대량 매도",
  orderbookRatio: "호가창 매수/매도 비율",
  newsImageAlt: (symbol: string) => `${symbol} 뉴스 이미지`,
  /** 기사가 없을 때. **더미를 만들지 않는다** (`FE-REQ-010` FR-42) */
  newsEmpty: "관련 뉴스가 없습니다",
  newsViews: (count: number) => `조회 ${count.toLocaleString("ko-KR")}`,
} as const;

/** 기간 변동률 문구. 표 셀이 쓴다. */
export const MARKET_CHANGE_MESSAGES = {
  /** 기준 시세가 없는 기간. 0% 로 그리지 않는다 — 변동 없음과 기록 없음은 다르다 */
  unknown: "—",
  unknownTitle: "이 기간의 시세 기록이 없습니다",
} as const;

/** 관심 목록 문구. `MARKET_MESSAGES` 와 나눈 이유는 소비하는 화면이 다르기 때문이다. */
export const WATCHLIST_MESSAGES = {
  loading: "관심 종목을 불러오는 중입니다.",
  loadFailed: "관심 종목을 불러오지 못했습니다.",
  emptyTitle: "관심 종목이 없습니다",
  emptyDescription: "실시간 차트에서 별을 눌러 추가하세요",
  /** 값이 없을 때 0 을 쓰지 않는다 — 가격 없음과 0원은 다르다 */
  priceUnknown: "—",
  staleBadge: "지연",
  staleBadgeTitle: "실시간이 아닌 저장 시세다",
  add: (name: string) => `${name} 관심 종목 추가`,
  remove: (name: string) => `${name} 관심 종목 제거`,
  removeFailed: "관심 종목을 바꾸지 못했습니다.",
  signInRequired: "로그인하면 관심 종목을 볼 수 있습니다.",
} as const;

/**
 * 자산군 배지 문구.
 *
 * 모르는 값이 오면 배지를 만들지 않는다 — `DB-REQ-003` 이 enum 을 넓히면 여기에
 * 한 줄을 더한다. 임의의 문자열을 그대로 배지에 넣으면 DB 내부 이름이 화면에 나간다.
 */
export const WATCHLIST_ASSET_LABELS: Readonly<Record<string, string>> = {
  crypto: "크립토",
  stock: "주식",
  kr_stock: "국내주식",
  us_stock: "미국주식",
};

/** 테이블 헤더 5컬럼도 변경 금지 목록이다 (`FE-REQ-009` FR-36). */
export const MARKET_TABLE_HEADERS = [
  { id: "currentPrice", value: "현재가" },
  { id: "changeRate", value: "변동률" },
  { id: "highPrice", value: "최고가" },
  { id: "lowPrice", value: "최저가" },
  { id: "trade_value", value: "거래대금" },
] as const;
