export const HOME_BRIEFING_MESSAGES = {
  tipHeading: "오늘의 저축 팁",
  tipTitle: "커피값 아끼기로 월 5만원 저축하기",
  tipBody: "하루 2잔, 연 60만원 절약 가능!",
  cardsBlockName: "요약",
} as const;

/** 홈 블록 높이 — 스켈레톤이 실제 블록과 같아야 한다 (`streaming-ssr.md`). */
export const HOME_BLOCK_MIN_HEIGHT = {
  /** 카드 2장(저축 · 투자) — 서비스가 없는 도메인은 카드가 없다 */
  cards: 260,
} as const;
