/** 홈 요약 카드 문구 (`i18n-policy.md`). 카드 제목 · 값 문구는 BFF 가 준다 — 여기는 상태 문구만 */
export const HOME_CARD_MESSAGES = {
  loading: "요약을 불러오는 중…",
  loadFailed: "요약을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
  /** 카드 하나를 받지 못했을 때 — 0 으로 그리지 않는다 */
  degraded: "지금은 불러오지 못했어요",
  /** 비어 있는 카드의 예시 그림 표지 — 실제 값으로 읽히지 않게 */
  sample: "예시",
} as const;

/** 홈 둘째 줄 — 최근 기록 · 다가오는 일(`FE-REQ-048` FR-13). 줄 안 문구(지출 · 저축에 넣음 …)는 BFF 가 준다 */
export const HOME_FEED_MESSAGES = {
  recentTitle: "최근 기록",
  upcomingTitle: "다가오는 일",
  recentEmpty: "아직 기록이 없어요. 지출을 적거나 목표에 넣으면 여기 날짜 순으로 모여요.",
  upcomingEmpty: "다가오는 일이 없어요. 매달 나가는 돈이나 목표 기한을 정하면 여기 보여요.",
  unavailable: "지금은 불러오지 못했어요",
  expenseFallback: "지출",
  sub: (detail: string, date: string) => `${detail} · ${date}`,
} as const;
