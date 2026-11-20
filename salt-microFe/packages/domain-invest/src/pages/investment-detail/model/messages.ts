export const INVESTMENT_DETAIL_PAGE_MESSAGES = {
  blockName: "상세 분석",
  /** 브라우저 탭 제목(`FE-REQ-049` FR-12) — `{가격} {등락률} | {이름}` · 장 밖이면 끝에 "장 마감" */
  tabTitle: (price: string, rate: string, name: string, closed: boolean) =>
    `${price} ${rate}${closed ? " 장 마감" : ""} | ${name}`,
  /** 뒤로 버튼 이름 · 이동 경로(`FE-REQ-047` FR-10) — 경로 칸은 투자 › 자산군 › 종목 */
  back: "뒤로",
  trailLabel: "이동 경로",
  trailInvest: "투자",
  trailCrypto: "코인",
  trailKr: "국내 주식",
  /** 로그인 없이 볼 때 유리막 칸 이름(`FE-REQ-070` FR-7) */
  guestWhat: { preflight: "주문 전 체크", record: "거래 기록", scenario: "다음 시나리오" },
  /** 내 거래 패널 제목 — 오른쪽 고정 열(`FE-REQ-049` FR-3) */
  tradeHeading: "내 거래",
  /** 알약 탭(`FE-REQ-049` FR-2 · 사용자 결정 2026-11-19 "합치기") — 개요 = 차트 + 한 장 패널, 나머지는 펼침에 있던 것 */
  tabsLabel: "종목 상세 보기",
  tabs: { overview: "개요", orderbook: "호가 · 투자자", investors: "투자자", newsEvents: "소식 · 일정", trade: "내 거래" },

  /** 요약 지표 (`FE-REQ-026` FR-131 헤더). 값은 전부 서버가 준 것이다. */
  /** 업비트 고가 · 저가는 **당일**(오전 9시부터) — ~~24시간 범위~~(`FE-REQ-075`). 거래대금만 진짜 24시간 누적 */
  statRange: "당일 범위",
  /** 머리 시장 칩 · 범위 막대 · [더 보기](`FE-REQ-049` FR-1) */
  marketCrypto: "코인",
  statDayRange: "1일",
  statWeek52Range: "52주",
  rangeSr: (label: string, low: string, high: string) => `${label} 범위 ${low}에서 ${high}`,
  statsMore: "더 보기",
  statTickSize: "호가 단위",
  chartHeading: "차트",
  statTradeValue: "24시간 거래대금",
  statUpdatedAt: "시세 기준",
  /** 머리의 주문 전 체크 링크(FR-131) — 계산 카드로 간다. 주문하지 않는다 */
  preflight: "주문 전 체크",

  /** 메타데이터 — 검색 결과 · 공유 미리보기. 예측 · 확신 표현을 쓰지 않는다 */
  metaTitle: (name: string, symbol: string) => `${name}(${symbol}) 시세 · 차트 · AI 코치 판단`,
  metaTitleFallback: (symbol: string) => `${symbol} 시세 · 차트 · AI 코치 판단`,
  metaDescription: (name: string, price: string, change: string) =>
    `${name} 현재가 ${price}원, 전일 대비 ${change}. 과거 적중률과 틀렸던 사례까지 함께 보는 AI 코치 판단과 내 규칙 기반 가격 — 예측이 아닙니다.`,
  metaDescriptionFallback: (symbol: string) =>
    `${symbol} 차트와 과거 적중률 · 틀렸던 사례까지 함께 보는 AI 코치 판단 — 예측이 아닙니다.`,
  breadcrumbInvestments: "코인 시세",

  /** 국내 주식 상세(F011) — 메타데이터에 시세를 넣지 않는다(KRX 재배포 약관) */
  krBlockName: "국내 주식 상세",
  krMetaTitle: (code: string) => `국내 주식 ${code}`,
} as const;

/** 본문 자리 높이 — Hero + 차트(320) + 탭 · 여백. 도착 전 푸터가 올라붙지 않게 */
export const INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT = 640;
