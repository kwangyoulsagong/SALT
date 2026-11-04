/** 예산 정하기 문구 — 예산은 막지 않는다(FEATURE-013 FR-6). 넘쳐도 경고하지 않는다는 것을 미리 말해 둔다 */
export const BUDGET_MESSAGES = {
  title: "예산 정하기",
  description: "예산은 지출을 막지 않아요. 넘치면 남은 돈이 음수로 보일 뿐이에요",
  method: "방식",
  methods: { "50_30_20": "50/30/20", envelope: "봉투", account_split: "통장 쪼개기" },
  methodNote: {
    "50_30_20": "월 소득을 꼭 필요한 데 50% · 하고 싶은 데 30% · 모으기 20% 로 나눠요",
    envelope: "분류마다 이번 달에 쓸 돈을 정해요. 비워 둔 분류는 봉투 밖으로 세요",
    account_split: "월 소득을 통장 넷으로 나눠 이름표를 붙여요. 반복 지출(월세 · 통신 · 구독)은 급여 통장, 나머지 지출은 생활비 통장으로 세요",
  },
  income: "월 소득",
  savingsShare: (won: string) => `모으기 몫 ${won} — 저축 목표 쪽에서 넣어요`,
  salaryShare: (won: string) => `급여 통장에 남는 몫 ${won} — 반복 지출이 여기서 나가요`,
  submit: "저장",
  saved: "예산을 저장했어요",
  failed: "저장 못 했어요. 입력한 값은 그대로 있어요",
  needOne: {
    "50_30_20": "월 소득을 넣어 주세요",
    envelope: "봉투를 하나 이상 채워 주세요",
    account_split: "월 소득과 생활비 통장을 넣어 주세요",
  },
} as const;
