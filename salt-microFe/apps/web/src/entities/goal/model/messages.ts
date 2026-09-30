export const GOAL_MESSAGES = {
  loading: "목표를 불러오는 중…",
  loadFailed: "목표를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
  /** 빈 목록 (`FE-REQ-044` P-10) — 목록이 비면 빈 카드가 아니라 장면 한 장 */
  emptyTitle: "아직 목표가 없어요",
  emptyDescription: "위의 [추가]로 모을 목표를 정해 보세요.",
  savedCaption: "현재 모은 금액",
  addButton: "추가",
  targetLabel: (target: string) => `목표 ${target}원`,
  amountLabel: (amount: string) => `${amount}원`,
  selected: "선택",
  progress: "진행중",
  complete: "달성",
  dday: "D-Day",
  achievementRate: "달성률",
  /** 서버가 주지 않는 값 — 지어내지 않는다 */
  emptyValue: "—",
} as const;
