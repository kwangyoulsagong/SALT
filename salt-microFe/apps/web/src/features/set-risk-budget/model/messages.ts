/**
 * 내 기준(IPS 3문항) 입력 문구 (F009 FR-1~2 · 시나리오 7 · `FE-REQ-039`). **필수가 아니다** — 비우면 그 게이지가
 * "기준을 정하면 보여요". 0 이나 기본값으로 채우지 않는다. 물음으로 묻지 않는다 — 지시가 아니라 내가 정하는 칸이다.
 */
export const SET_RISK_BUDGET_MESSAGES = {
  open: "내 기준 정하기",
  edit: "기준 바꾸기",
  close: "접기",
  monthly: "월 허용 손실",
  perTrade: "1회 최대 손실",
  cap: "한 종목 상한",
  intro: "세 가지만 정하면 게이지와 거래 크기 계산이 내 기준으로 보여요. 전부 선택이에요",
  unitKrw: "원",
  unitPercent: "%",
  unitLabel: (name: string) => `${name} 단위`,
  placeholder: "비우면 지워요",
  capPlaceholder: "비우면 기본 60%",
  hint: "% 는 총자산 대비예요. 원 환산은 서버가 지금 평가금으로 해요",
  targetVol: (rate: string, isDefault: boolean) =>
    isDefault ? `목표 변동성 ${rate}(기본값)` : `목표 변동성 ${rate}`,
  save: "저장",
  saving: "저장하는 중",
  saved: "기준을 저장했어요",
  invalid: "0보다 큰 숫자로 적거나 비워 주세요",
  invalidPercent: "0보다 크고 100 이하인 숫자로 적거나 비워 주세요",
  invalidCap: "5에서 100 사이 숫자로 적거나 비워 주세요",
  failed: "지금은 저장하지 못했어요. 입력은 그대로 있어요",
} as const;
