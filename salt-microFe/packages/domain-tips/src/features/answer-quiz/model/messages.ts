/** 읽기 전에 맞혀 보기 문구(`FE-REQ-058` FR-5). 재촉 · 점수 · 실패 말 0 — 맞혀도 틀려도 풀이 한 줄이 남는 것이 목적이다 */
export const ANSWER_QUIZ_MESSAGES = {
  eyebrow: "읽기 전에 맞혀 보기",
  choicesLabel: "보기",
  correct: "맞았어요",
  wrong: "정답은 다른 보기예요",
  answerIs: (answer: string) => `정답: ${answer}`,
  picked: "고른 보기",
  rightChoice: "정답",
  collected: "맞힌 카드에 담았어요",
  alreadyCollected: "이미 모은 카드예요",
  signInToCollect: "로그인하면 맞힌 문제를 카드로 모을 수 있어요",
  cardsLink: "맞힌 카드 보기",
  retry: "다시 풀기",
  failed: "채점하지 못했어요. 보기를 다시 누를 수 있어요",
} as const;
