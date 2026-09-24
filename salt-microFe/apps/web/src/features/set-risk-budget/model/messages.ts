/**
 * 리스크 예산 입력 문구 (F009 FR-1~2 · `FE-REQ-039`). **필수가 아니다** — 비우면 그 게이지가 "기준을 정하면 보여요".
 * 0 이나 기본값으로 채우지 않는다.
 */
export const SET_RISK_BUDGET_MESSAGES = {
  open: "내 기준 정하기",
  edit: "기준 바꾸기",
  close: "접기",
  monthly: "월 허용 손실",
  perTrade: "1회 최대 손실",
  unit: "원",
  placeholder: "비우면 지워요",
  percentNow: (percent: string) => `지금 기준: 총자산의 ${percent}`,
  hint: "한 종목 상한은 코치 설정의 비중 상한을 써요",
  targetVol: (rate: string, isDefault: boolean) =>
    isDefault ? `목표 변동성 ${rate}(기본값)` : `목표 변동성 ${rate}`,
  save: "저장",
  saving: "저장하는 중",
  saved: "기준을 저장했어요",
  invalid: "0보다 큰 숫자로 적거나 비워 주세요",
  failed: "지금은 저장하지 못했어요. 입력은 그대로 있어요",
} as const;
