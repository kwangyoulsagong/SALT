/** 맞힌 카드 모음 문구(`FE-REQ-058` FR-5) — 모은 수만, 순위 · 점수 0 */
export const QUIZ_CARDS_PAGE = {
  title: "맞힌 카드",
  description: "글을 읽기 전에 맞힌 문제가 여기 모여요. 한 번 모은 카드는 다시 틀려도 남아요",
  back: "금융 팁",
  count: (collected: number, available: number) => `${available}문제 중 ${collected}장`,
  emptyTitle: "아직 모은 카드가 없어요",
  emptyDescription: "글 위의 '읽기 전에 맞혀 보기'를 맞히면 카드가 생겨요",
  signedOut: "로그인하면 맞힌 카드를 볼 수 있어요",
  loadFailed: "카드를 불러오지 못했어요",
  notPublic: "준비 중이에요",
  answer: "정답",
  collectedOn: "모은 날",
  readTip: "글 보기",
  blockName: "맞힌 카드",
} as const;
