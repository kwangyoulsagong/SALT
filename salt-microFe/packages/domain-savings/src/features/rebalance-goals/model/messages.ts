/** 목표 저울 문구 — 사실만. 어느 목표가 먼저라고 권하지 않는다(FEATURE-012 FR-6 "스스로 정한다") */
export const REBALANCE_MESSAGES = {
  title: "목표 저울",
  description: "목표마다 월 적립을 바꿔 보면 도달 시점이 어떻게 바뀌는지 보여 줘요. 확정하기 전엔 저장하지 않아요",
  monthly: (title: string) => `${title} 월 적립`,
  total: "월 적립 합계",
  totalChange: (before: string, after: string) => `${before} → ${after}`,
  shift: (months: number) => (months === 0 ? "도달 월 그대로" : months > 0 ? `${months}개월 늦어져요` : `${-months}개월 빨라져요`),
  unchanged: "바꾸지 않음",
  noPlan: "계획 없음",
  deadlineMissed: (deadline: string) => `기한(${deadline})보다 늦어요`,
  confirm: "확정하기",
  reset: "되돌리기",
  saved: "월 계획을 바꿨어요",
  failed: "저장하지 못했어요. 다시 시도해 주세요",
  calcFailed: "지금은 계산하지 못했어요",
} as const;
