export const GOAL_MESSAGES = {
  loading: "Loading...",
  loadFailed: "Error loading goals",
  savedCaption: "현재 모은 금액",
  addButton: "추가",
  targetLabel: (target: string) => `목표 ${target}원`,
  amountLabel: (amount: string) => `${amount}원`,
  selected: "선택",
  progress: "진행중",
  complete: "달성",
  dday: "D-Day",
  achievementRate: "달성률",
} as const;
