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
  checklist: {
    toggle: "진입 전 체크 (선택)",
    hint: "내 기록에서 손실이 컸던 패턴이에요. 체크는 기록만 되고 저장을 막지 않아요",
    noItems: "아직 손실로 끝난 태그가 없어 질문이 없어요. 한 줄 답만 남길 수 있어요",
    listLabel: "내 실수 태그에서 나온 질문",
    premortemPlaceholder: "한 줄로 — 계획의 무효화 조건으로 저장돼요",
  },
  idleHint: "수량과 단가를 적으면 이 거래의 크기를 계산해요",
  stopIdleHint: "손절가를 적으면 손실 크기를 계산해요",
  submit: "기록하기",
  submitting: "기록하는 중",
  saved: "거래 기록이 등록됐어요",
  savedWithPlan: "거래 기록이 등록됐어요 · 계획도 함께 저장했어요",
  planFailed: "거래 기록은 등록됐어요. 계획은 저장하지 못했어요",
  retryPlan: "계획만 다시 저장",
  retryPlanDone: "계획을 저장했어요",
  /** 국내 주식(F011 슬라이스 3b) — 계획 · 사이즈 계산은 코치가 국내 주식을 받는 슬라이스 4 부터 */
  krStock: {
    quantityUnit: "주",
    tickHint: (tick: string) => `현재가 기준 호가 단위는 ${tick}원이에요. 배수가 아니어도 그대로 기록돼요`,
    coachLater: "국내 주식은 거래만 기록해요. 계획 · 크기 계산은 코치가 국내 주식을 판단하게 되면 열려요",
  },
  errors: {
    notAvailable: "이 종목은 기록할 수 없어요",
    invalidAmount: "수량과 단가는 0보다 큰 숫자로 적어 주세요",
    invalidStop: "손절가는 0보다 큰 숫자로 적어 주세요",
    insufficient: "보유 수량보다 많이 매도할 수는 없어요",
    signedOut: "로그인하면 거래를 기록할 수 있어요",
    failed: "지금은 기록하지 못했어요. 입력은 그대로 있어요",
  },
} as const;
