/** 월 마감 리뷰 문구(가계부 S1b) — 묻기만, 평가 · 점수 · 칭찬 0. 해요체 */
export const CLOSE_MESSAGES = {
  title: "이 달 돌아보기",
  description: "세 가지를 적어 두면 다음 달에 다시 볼 수 있어요. 비워 둬도 닫혀요",
  questions: {
    satisfied: "이 달 가장 만족한 지출은?",
    try_next: "다음 달 다르게 해 볼 것은?",
    known_next: "다음 달 미리 아는 지출은?",
  },
  submitClose: "이 달 닫기",
  submitEdit: "고친 답 저장",
  // 닫은 시각은 UTC 문자열이라 날짜를 화면에서 다시 셈하지 않는다(달력 날짜가 하루 어긋날 수 있다)
  closed: "닫은 달이에요 · 예산은 닫을 때 값으로 봐요",
  saved: "저장했어요",
  failed: "저장 못 했어요. 적은 답은 그대로 있어요",
  tooLong: "300자까지 적을 수 있어요",
  notYet: "이 달은 마지막 3일부터 닫을 수 있어요",
} as const;
