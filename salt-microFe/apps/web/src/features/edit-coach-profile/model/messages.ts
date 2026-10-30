/**
 * 코치 설정 문구 (F004 FR-12 · `FE-REQ-026` FR-80~82). 칸마다 **무엇이 달라지는지**를 한 줄로 말한다 — 바꿔도 아무것도
 * 달라지지 않는 칸은 두지 않는다(FR-80 개정). 매도 기간은 행동을 평가하는 말이 아니라 견주는 기간이다 —
 * 2인칭 평가 · "공포" 같은 이름을 붙이지 않는다(공통 수용 기준 §6).
 */
export const EDIT_COACH_PROFILE_MESSAGES = {
  defaultMode: "처음 보는 판단",
  defaultModeHint: "종목 화면을 열 때 이 관점이 먼저 보여요. 화면에서 바꾼 관점은 주소에 남아 그대로예요",
  window: "매도 돌아보는 기간",
  windowHint: (min: number, max: number) =>
    `이 기간 안의 매도를 지금 가격과 견줘 코치 리포트 "최근 행동"에 보여요. ${min}~${max}시간(7일)`,
  windowUnit: "시간",
  invalidWindow: (min: number, max: number) => `${min}에서 ${max} 사이 정수로 적어 주세요`,
  save: "저장",
  saving: "저장하는 중",
  saved: "설정을 저장했어요",
  failed: "지금은 저장하지 못했어요. 입력은 그대로 있어요",
  unavailable: "설정을 불러오지 못해 지금은 바꿀 수 없어요",
  fieldUnavailable: "불러오지 못했어요",
} as const;
