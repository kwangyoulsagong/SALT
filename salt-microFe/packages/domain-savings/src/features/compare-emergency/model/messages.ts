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
  loanMonthly: (amount: string, months: number) => (months === 1 ? `한 번에 ${amount}` : `매달 ${amount}씩 ${months}개월`),
  /** 원 단위로 나눈 나머지 — 앞 달이 1원 더 낸다. 숫자가 그대로 더해진다 */
  loanSplit: (first: string, firstMonths: number, rest: string, restMonths: number) =>
    `처음 ${firstMonths}개월 ${first} · 나머지 ${restMonths}개월 ${rest}`,
  loanReason: {
    amount_too_small: "이 금액은 그 달 수로 나눠 갚을 수 없어요",
  } as Readonly<Record<string, string>>,
  /** 모르는 사유 — 오류처럼 보이지 않게(꺼내기 칸은 정상이다) */
  loanUnavailable: "빌리는 쪽은 이 조건으로 보여 줄 수 없어요",
  loanInterest: (amount: string) => `이자 합계 ${amount}`,
  assumption: {
    loan_paid_outside_goal: "갚는 돈은 목표 적립과 따로 낸다고 보고 계산했어요",
  } as Readonly<Record<string, string>>,
  failed: "지금은 계산하지 못했어요",
  errorCode: {
    EMERGENCY_AMOUNT_OVER_SAVED: "모은 돈보다 많이 꺼낼 수는 없어요",
    EMERGENCY_MONTHS_INVALID: "갚는 달 수는 1~120개월이에요",
    EMERGENCY_RATE_INVALID: "금리는 0~30% 사이로 적어 주세요",
  } as Readonly<Record<string, string>>,
} as const;
