/** 해 경조사 봉투 문구(가계부 S1h) — 막지 않는다 · 넘어도 같은 색. 해요체 */
export const OCCASION_ENVELOPE_MESSAGES = {
  title: (year: number) => `${year}년 경조사 봉투`,
  description: "경조사는 달마다 오지 않아서 한 해 금액으로 정해요. 사람 장부에 적은 준 돈으로 남은 금액을 봐요",
  amount: "한 해 금액",
  set: "정하기",
  change: "바꾸기",
  remove: "봉투 지우기",
  failed: "저장하지 못했어요. 다시 눌러 주세요",
  status: (gave: string, amount: string) => `준 돈 ${gave} / 봉투 ${amount}`,
  remaining: (value: string) => `남은 금액 ${value}`,
} as const;
