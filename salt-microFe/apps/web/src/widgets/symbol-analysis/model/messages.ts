/** 상세 분석 페이지 조립 문구 (`FE-REQ-026` L) */
export const SYMBOL_ANALYSIS_MESSAGES = {
  /** 패널 제목. 카드 안에서 가장 큰 것은 내용이어야 하므로 짧게 둔다. */
  chartHeading: "차트 · 구간",
  coachHeading: "코치 판단",
  explainHeading: "해설",
  profitPlanHeading: "수익 플랜",
  zoneHeading: "구간",

  /** 소유자 카드 접기(F010 `FE-REQ-040` FR-8) — 판정 · 차트가 먼저, 참고 카드는 한 번 눌러서 */
  moreSummary: "자세히 — 변동 범위 · 주요 사건 · 쏠림",
  moreHint: "펼쳐 보기",

  /** 하단 고정 띠. 면책은 서버 문장을 그대로 싣는다. */
  disclaimerLabel: "투자 유의사항",
} as const;
