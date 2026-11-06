/**
 * 홈 카드 배치 문구(`FE-REQ-055` FR-2 · FR-8). 카드 이름은 BFF 카드 제목 그대로 — 여기 도메인 이름을 다시 두지 않는다.
 */
export const ARRANGE_HOME_MESSAGES = {
  heading: "홈 카드",
  description: "홈에 보일 카드와 순서를 정해요. 하나는 보여야 해요",
  moveUp: (title: string) => `${title} 위로`,
  moveDown: (title: string) => `${title} 아래로`,
  up: "위로",
  down: "아래로",
  show: (title: string) => `${title} 홈에 보이기`,
  failed: "저장하지 못했어요. 잠시 뒤 다시 바꿔 주세요",
  unavailable: "홈 카드를 불러오지 못해 지금은 바꿀 수 없어요",
} as const;
