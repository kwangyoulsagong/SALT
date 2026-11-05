/** 사람 장부 문구(가계부 S1h) — 사실만. "갚을 돈" · "덜 줬다" 같은 판단 0. 해요체 */
export const RECORD_GIFT_MESSAGES = {
  addTitle: "주고받은 돈 적기",
  editTitle: "고치기",
  person: "누구와",
  personPlaceholder: "이름",
  direction: "준 돈 · 받은 돈",
  amount: "금액",
  occasion: "어떤 일",
  happenedOn: "날",
  memo: "메모(선택)",
  submit: "적기",
  save: "고치기",
  cancel: "닫기",
  failed: "저장하지 못했어요. 다시 눌러 주세요",
  errors: {
    PERSON_NAME_TOO_LONG: "이름은 20자까지예요",
    PERSON_DATE_FUTURE: "앞으로의 날은 적을 수 없어요",
    PERSON_DATE_TOO_OLD: "2000년부터 적을 수 있어요",
    PERSON_AMOUNT_TOO_LARGE: "금액이 너무 커요",
    PERSON_MEMO_TOO_LONG: "메모는 100자까지예요",
  } as Record<string, string>,
  privacy: "이름은 이 장부에만 남아요. 이야기 카드 · 알림에 나가지 않아요",
  // 목록
  empty: "적은 게 없어요",
  edit: "고치기",
  delete: "지우기",
  deleteFailed: "지우지 못했어요. 다시 눌러 주세요",
  line: (occasion: string, date: string) => `${occasion} · ${date}`,
  // 줄마다 같은 "고치기" · "지우기"면 화면 읽기가 어느 줄인지 모른다(확인 단계 — 대상 이름을 붙인다)
  editLabel: (person: string, occasion: string, date: string) => `${person} · ${occasion} · ${date} 고치기`,
  deleteLabel: (person: string, occasion: string, date: string) => `${person} · ${occasion} · ${date} 지우기`,
} as const;
