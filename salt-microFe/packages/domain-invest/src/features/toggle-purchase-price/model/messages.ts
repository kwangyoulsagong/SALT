/**
 * 매입가 숨김 문구 (F009 FR-27 · `FE-REQ-039` FR-13). 근거는 매입가 표시를 지우면 처분효과가 줄었다는
 * 실험(FEATURE-009 리서치 §2-3) — 화면이 그 연구를 말하지는 않는다. 숨기라고 권하지 않는다 — 내가 고르는 칸이다.
 */
export const TOGGLE_PURCHASE_PRICE_MESSAGES = {
  label: "매입가 숨기기",
  description: "켜면 홈 보유 요약에서 손익률이 빠져요. 산 값 대신 지금 값으로 보게 돼요",
  failed: "저장하지 못했어요. 잠시 뒤 다시 바꿔 주세요",
  unavailable: "설정을 불러오지 못해 지금은 바꿀 수 없어요",
} as const;
