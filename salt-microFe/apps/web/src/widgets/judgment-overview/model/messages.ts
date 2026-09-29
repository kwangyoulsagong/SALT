/**
 * `/investments` 머리 아래 카드 2장 문구 (F010 슬라이스 3 · `FE-REQ-040` FR-5 · FR-7).
 * 카드 안의 숫자 문구는 엔티티(`RISK_MESSAGES` · `SCOREBOARD_MESSAGES`)가 갖는다 — 여기는 카드 틀만.
 */
export const JUDGMENT_OVERVIEW_MESSAGES = {
  risk: {
    heading: "위험에 노출된 돈",
    description: "이번 달 손실 · 쏠림 · BTC 에 묶인 정도를 내 기준과 나란히 봐요. 넘어도 아무것도 막지 않아요",
    reportLink: "자세히",
    reportLinkLabel: "코치 리포트에서 리스크 예산 자세히 보기",
  },
  regionLabel: "이번 주 목표 비중 · 오늘의 위험 · 판정 성적",
} as const;
