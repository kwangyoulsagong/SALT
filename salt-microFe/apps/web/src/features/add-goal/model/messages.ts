export const ADD_GOAL_MESSAGES = {
  titlePlaceholder: "title",
  amountPlaceholder: "amount",
  submit: "추가하기",
  selected: "선택",
  /** 날짜 입력이 없어서 기본값을 쓴다 — 그 사실을 숨기지 않는다 (`FE-REQ-010` FR-9) */
  defaultPeriodNotice: "목표일은 오늘부터 1년 뒤로 잡힙니다",
  categoryRequired: "카테고리를 먼저 고르세요",
  submitting: "추가하는 중…",
  submitFailed: "목표를 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  /** 완료 장면 (`FE-REQ-044` P-2) — 사실만 쓴다 */
  successTitle: "목표를 추가했어요",
  successDescription: "홈에서 모은 돈과 남은 기간을 볼 수 있어요.",
  goHome: "홈으로",
} as const;

/** 완료 장면을 보여 주고 홈으로 넘어가기까지(ms) — 체크가 그려지고 한 번 튀는 데 1초가 걸린다 */
export const ADD_GOAL_SUCCESS_HOLD_MS = 1600;
