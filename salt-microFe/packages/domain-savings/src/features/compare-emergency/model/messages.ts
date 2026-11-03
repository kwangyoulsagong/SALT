/**
 * 비상시 비교 문구 — 두 줄의 숫자만. 어느 쪽이 낫다고 말하지 않는다 · 상품 · 금융사 이름 · 링크 0(FEATURE-012 FR-11 · 정책).
 * 금리는 사용자가 넣은 값이라는 점을 문구가 말한다
 */
export const EMERGENCY_MESSAGES = {
  title: "급하게 돈이 필요하면",
  description: "목표에서 꺼낼 때와 빌릴 때를 숫자로 나란히 보여 줘요. 저장하지 않아요",
  amount: "필요한 돈",
  rate: "빌릴 때 연 금리(%) — 직접 적어요",
  months: "갚는 달 수",
  withdrawTitle: "목표에서 꺼내면",
  withdrawDelay: (months: number) => (months === 0 ? "계획대로면 도달 월은 그대로예요" : `계획대로면 도달이 ${months}개월 늦어져요`),
  withdrawMonths: (before: string, after: string) => `${before} → ${after}`,
  loanTitle: "빌리면",
  loanMonthly: (amount: string, months: number) => `매달 ${amount}씩 ${months}개월`,
  /** 올림 차액을 끝 달이 덜 낸다 — 같으면 붙이지 않는다 */
  loanLast: (amount: string) => `마지막 달은 ${amount}`,
  loanInterest: (amount: string) => `이자 합계 ${amount}`,
  assumption: {
    loan_paid_outside_goal: "갚는 돈은 목표 적립과 따로 낸다고 보고 계산했어요",
  } as Readonly<Record<string, string>>,
  failed: "지금은 계산하지 못했어요",
  errorCode: {
    EMERGENCY_AMOUNT_OVER_SAVED: "모은 돈보다 많이 꺼낼 수는 없어요",
    EMERGENCY_MONTHS_INVALID: "갚는 달 수는 1~120개월이에요",
    EMERGENCY_RATE_INVALID: "금리는 0~30% 사이로 적어 주세요",
    EMERGENCY_AMOUNT_TOO_SMALL: "이 금액은 그 달 수로 나눠 갚을 수 없어요",
  } as Readonly<Record<string, string>>,
} as const;
