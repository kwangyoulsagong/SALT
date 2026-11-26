/** ~~오늘의 저축 팁(코드에 박힌 문장 하나)~~ 2026-11-19 뺐다 — 진짜 팁이 아니었다(사용자 결정 · `FE-REQ-048`). 팁은 팁 도메인이 공개될 때 */
export const HOME_BRIEFING_MESSAGES = {
  cardsBlockName: "요약",
} as const;

/** 오른쪽 칸 "바로 적기"(`FE-REQ-048` FR-8) — 해요체 · 재촉 0 */
export const QUICK_ACTION_MESSAGES = {
  title: "바로 적기",
  expense: "지출 적기",
  expenseHint: "금액부터 적어도 돼요",
  goal: "새 목표 만들기",
  goalHint: "금액과 기한을 정해요",
} as const;

/** 홈 블록 높이 — 스켈레톤이 실제 블록과 같아야 한다 (`streaming-ssr.md`). */
export const HOME_BLOCK_MIN_HEIGHT = {
  /** 대시보드 대기 — 숫자 띠(108) · 블록 줄(300) 자리(2026-11-26) */
  kpi: 108,
  row: 300,
  /** 카드 격자 한 줄(미리보기가 든 카드 264) — 넓은 패널은 한 줄 셋(`FE-REQ-048` FR-12) */
  cards: 264,
  /** 카드 하나 — `HomeSummaryCardView` 최소 높이와 같다 */
  card: 264,
} as const;
