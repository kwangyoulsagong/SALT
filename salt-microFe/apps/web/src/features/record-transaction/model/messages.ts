/**
 * 거래 기록 폼 문구 (F009 `FE-REQ-039` · `i18n-policy.md`).
 *
 * **주문 화면이 아니다** — "사다 · 팔다"를 시키는 말이 없다. 이미 한 거래를 "적는다".
 * 계획은 선택이다 — 비워도 저장된다(FR-10). 넘어도 막지 않는다(2026-09-08 결정).
 */
export const RECORD_TRANSACTION_MESSAGES = {
  heading: "거래 기록",
  description: "이미 한 거래를 적어요. 주문은 나가지 않아요",
  sideLabel: "구분",
  side: { buy: "매수", sell: "매도" },
  quantity: "수량",
  quantityUnit: "개",
  price: "단가",
  priceUnit: "원",
  useLivePrice: "현재가",
  useLivePriceLabel: "단가에 현재가 넣기",
  date: "날짜",
  planToggle: "계획 (선택)",
  planHint: "손절가와 이유를 적으면 손실 크기를 계산하고 나중에 지켰는지 보여 드려요",
  stopPrice: "손절가",
  thesis: "이유",
  thesisPlaceholder: "한 줄로 (200자까지)",
  idleHint: "수량과 단가를 적으면 이 거래의 크기를 계산해요",
  stopIdleHint: "손절가를 적으면 손실 크기를 계산해요",
  submit: "기록하기",
  submitting: "기록하는 중",
  saved: "기록했어요",
  savedWithPlan: "기록했어요 · 계획도 함께 저장했어요",
  planFailed: "거래는 기록했어요. 계획은 저장하지 못했어요",
  retryPlan: "계획만 다시 저장",
  retryPlanDone: "계획을 저장했어요",
  errors: {
    invalidAmount: "수량과 단가는 0보다 큰 숫자로 적어 주세요",
    invalidStop: "손절가는 0보다 큰 숫자로 적어 주세요",
    insufficient: "보유 수량보다 많이 매도할 수는 없어요",
    signedOut: "로그인하면 거래를 기록할 수 있어요",
    failed: "지금은 기록하지 못했어요. 입력은 그대로 있어요",
  },
} as const;
