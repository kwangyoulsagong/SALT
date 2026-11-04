/** 노동시간 설정 문구(가계부 S1c FR-15) — 급여는 민감 정보라는 것을 같이 말한다. 재촉 · 평가 0 */
export const WORK_SETTING_MESSAGES = {
  title: "근무 시간으로 보기",
  description: "지출 옆에 '근무 2시간 18분'처럼 보여요. 적은 급여는 이 계산에만 쓰고 다른 곳에 보내지 않아요",
  on: "근무 시간으로 보기",
  basis: "기준",
  bases: { hourly: "시급", monthly: "월급" },
  amount: { hourly: "시급(원)", monthly: "월급(원)" },
  monthlyHours: "한 달 근무 시간(선택)",
  monthlyHoursHint: (n: number) => `비우면 ${n}시간(주 40시간 + 주휴)으로 봐요`,
  submit: "저장",
  saved: "저장했어요",
  hourly: (amount: string) => `1시간 ${amount}으로 계산해요`,
  offKept: "꺼도 적은 급여는 남아 있어요. 다시 켜면 그대로 써요",
  failed: "저장 못 했어요. 입력한 값은 그대로 있어요",
  errorCode: {
    WAGE_REQUIRED: "켜려면 급여를 적어 주세요",
    WAGE_TOO_LARGE: "금액이 너무 커요",
    MONTHLY_HOURS_INVALID: "한 달 근무 시간은 1~400시간이에요",
  } as Readonly<Record<string, string>>,
} as const;
