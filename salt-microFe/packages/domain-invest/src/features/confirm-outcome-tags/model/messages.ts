/** 태그 확정 문구 (`FE-REQ-039` FR-17). 태그 이름은 `entities/coach` `MIRROR_MESSAGES.tagNames` 를 쓴다 */
export const CONFIRM_OUTCOME_TAGS_MESSAGES = {
  edit: "태그 고치기",
  editLabel: (symbol: string) => `${symbol} 청산 태그 고치기`,
  legend: "이 청산에 해당하는 것",
  confirm: "확정",
  confirming: "확정하는 중",
  cancel: "취소",
  saved: "확정했어요. 미러를 다시 셌어요",
  failed: "확정하지 못했어요. 잠시 뒤 다시 해 주세요",
  signedOut: "로그인이 풀렸어요. 다시 로그인해 주세요",
} as const;
