export const HOME_BRIEFING_MESSAGES = {
  taxCockpitLink: "세금 마감 콕핏",
  tipHeading: "오늘의 저축 팁",
  tipTitle: "커피값 아끼기로 월 5만원 저축하기",
  tipBody: "하루 2잔, 연 60만원 절약 가능!",
  goalsBlockName: "목표",
  investmentsBlockName: "투자",
  /** 투자 블록 전체가 링크다 — 스크린 리더가 읽는 이름(보이는 제목 "투자 분석"을 포함한다) */
  investmentsLinkLabel: "투자 분석 — 투자 화면으로 이동",
} as const;

/** 홈 블록 높이 — 스켈레톤이 실제 블록과 같아야 한다 (`streaming-ssr.md`). */
export const HOME_BLOCK_MIN_HEIGHT = {
  goals: 320,
  investments: 240,
} as const;
