/** 상세 분석 페이지 조립 문구 (`FE-REQ-026` L · F017 v4 순서 6 4블록 · `FE-REQ-049` 알약 탭) */
export const SYMBOL_ANALYSIS_MESSAGES = {
  /** 로그인 없이 볼 때 유리막 칸 이름(`FE-REQ-070` FR-7) — "로그인하고 {이름} 보기" */
  guestWhat: { preflight: "주문 전 체크", record: "거래 기록", scenario: "다음 시나리오" },
  /** 패널 제목. 패널 안에서 가장 큰 것은 내용이어야 하므로 짧게 둔다. 차트 위 선은 틀리는 선 하나(관찰 구간은 뺐다) */
  chartHeading: "차트",
  tradeHeading: "내 거래 · 내 선",
  profitPlanHeading: "익절 플랜",

  /** 알약 탭(`FE-REQ-049` FR-2) — 개요(차트 + 한 장 패널) · 일정. 내 거래는 1280 미만에서만 탭 */
  tabsLabel: "종목 상세 보기",
  tabs: { overview: "개요", events: "일정", trade: "내 거래" },
} as const;
