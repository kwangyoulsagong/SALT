/** 챌린지 고르기 문구(가계부 S1d) — 사실만. 재촉 · 칭찬 0. 해요체 */
export const START_CHALLENGE_MESSAGES = {
  title: "새 챌린지 고르기",
  presets: "예시",
  name: "이름",
  namePlaceholder: "커피 한 잔 아끼기",
  startsOn: "시작",
  endsOn: "끝",
  periodHint: (days: number) => `기간은 ${days}일까지예요. 언제든 그만둘 수 있어요`,
  submit: "시작하기",
  failed: "시작하지 못했어요. 다시 눌러 주세요",
  limitReached: "진행 중인 챌린지가 많아요. 하나를 끝내면 새로 고를 수 있어요",
  periodTooLong: (days: number) => `기간은 ${days}일까지예요`,
  periodInvalid: "끝 날이 시작보다 앞이에요",
  limit: (n: number) => `진행 중 · 시작 전은 ${n}개까지예요`,
} as const;
