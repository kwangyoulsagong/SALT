/** 홈 요약 카드 문구 (`i18n-policy.md`). 카드 제목 · 값 문구는 BFF 가 준다 — 여기는 상태 문구만 */
export const HOME_CARD_MESSAGES = {
  loading: "요약을 불러오는 중…",
  loadFailed: "요약을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
  /** 카드 하나를 받지 못했을 때 — 0 으로 그리지 않는다 */
  degraded: "지금은 불러오지 못했어요",
} as const;
