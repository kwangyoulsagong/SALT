/**
 * 내 숫자로 다시 읽기 문구(`FE-REQ-058` FR-3, 금융 팁 S2d). "받을 수 있어요" · 권유 0 — 해당될 수 있는지와 요건까지만.
 * 숫자 · 요건 문장은 서버가 준다. 여기는 머리 · 상태 이름 · 실패 한 줄만.
 */
export const READ_MY_NUMBERS_MESSAGES = {
  title: "내 숫자로 다시 읽기",
  description: "저축 목표와 가계부에 적은 값으로 이 글의 예시 숫자를 다시 계산했어요",
  signedOut: "로그인하면 이 글의 예시 숫자를 내 저축 목표 · 가계부 값으로 다시 읽을 수 있어요",
  failed: "지금은 내 숫자를 불러오지 못해 글의 예시 그대로예요",
  figuresLabel: "내 숫자",
  checksTitle: "요건",
  state: { met: "맞아요", not_met: "아니에요", unknown: "모름" },
  partial: "일부 값을 지금 읽지 못해 그 요건은 모름으로 두었어요",
  footnote: "해당될 수 있는지 살펴보는 계산이에요. 실제 공제 · 보호 여부는 연말정산 · 신고 자료와 금융회사 기준으로 정해져요",
  blockName: "내 숫자로 다시 읽기",
} as const;
