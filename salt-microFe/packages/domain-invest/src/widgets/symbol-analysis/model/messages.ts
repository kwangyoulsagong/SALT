/** 상세 분석 페이지 조립 문구 (`FE-REQ-026` L · F017 v4 순서 6 4블록) */
export const SYMBOL_ANALYSIS_MESSAGES = {
  /** 로그인 없이 볼 때 유리막 칸 이름(`FE-REQ-070` FR-7) — "로그인하고 {이름} 보기" */
  guestWhat: { preflight: "주문 전 체크", record: "거래 기록", scenario: "다음 시나리오" },
  /** 블록 제목. 카드 안에서 가장 큰 것은 내용이어야 하므로 짧게 둔다. 차트 위 선은 틀리는 선 하나(관찰 구간은 뺐다) */
  chartHeading: "차트",
  tradeHeading: "내 거래 · 내 선",
  profitPlanHeading: "익절 플랜",

  /** 펼침(F017 v4 순서 6 — 결정에 덜 쓰이는 것은 한 번 눌러서) */
  moreSummary: "더 보기 — 일정",
  moreHint: "펼쳐 보기",
} as const;
