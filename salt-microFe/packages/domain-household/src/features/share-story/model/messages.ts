/** 이야기 카드 공유 문구(가계부 S1g) — 사실만. 금액 가림이 기본이라는 것을 버튼 옆에서 말한다 */
export const SHARE_STORY_MESSAGES = {
  showAmounts: "금액 보이기",
  hiddenNote: "공유 이미지에도 지금 카드 그대로 담겨요. 금액은 가린 채로 시작해요",
  share: "이미지로 공유",
  saved: "이미지를 저장했어요",
  shared: "공유했어요",
  failed: "이미지를 만들지 못했어요. 다시 눌러 주세요",
  shareFailed: "공유하지 못했어요. 다시 눌러 주세요",
  fileName: (period: string) => `salt-story-${period}.png`,
} as const;
