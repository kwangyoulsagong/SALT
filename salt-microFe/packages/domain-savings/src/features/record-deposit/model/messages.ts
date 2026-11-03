/** 적립 문구 — 사실만. 칭찬 · 재촉 0(`FE-REQ-056` 수용 기준 2) */
export const RECORD_DEPOSIT_MESSAGES = {
  title: "적립 기록",
  amount: "넣은 돈",
  date: "날짜",
  note: "메모(선택)",
  submit: "기록하기",
  failed: "기록하지 못했어요. 다시 시도해 주세요",
  recorded: "기록했어요",
  split: {
    title: "여러 목표에 나눠 넣기",
    total: "넣은 돈 합계",
    part: (title: string) => `${title}에 넣은 돈`,
    hint: "나눈 금액의 합이 합계와 같아야 해요 — 서버가 확인해요",
    submit: "나눠서 기록하기",
    tooFew: "두 목표 이상에 금액을 적어 주세요",
  },
  errorCode: {
    SPLIT_SUM_MISMATCH: "나눈 금액의 합이 합계와 달라요",
    DEPOSIT_DATE_FUTURE: "오늘 이후 날짜는 기록할 수 없어요",
  } as Readonly<Record<string, string>>,
} as const;
