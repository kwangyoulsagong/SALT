/**
 * 거래 기록 시트 문구 · 상수(F006 G절 2단계 · `FE-REQ-030` FR-104~109 · `FE-REQ-031` FR-80~83).
 *
 * **주문이 아니다** — 이미 한 거래를 적고 고치고 지운다. 평단 · 수량 전후는 서버 미리보기 값이고 여기서 계산하지 않는다.
 */
export const LEDGER_PREVIEW_DEBOUNCE_MS = 300;

export const LEDGER_SHEET_MESSAGES = {
  createTitle: "거래 기록 추가",
  editTitle: "거래 기록 고치기",
  description: "이미 한 거래를 적어요. 주문은 나가지 않아요.",
  openButton: "거래 기록 추가",
  assetLabel: "자산군",
  symbolLabel: "종목",
  symbolSearchLabel: "종목 검색",
  symbolSearchPlaceholder: "이름이나 코드로 찾기",
  symbolChange: "다른 종목",
  symbolNone: "찾는 종목이 없어요",
  /** 빈 검색어 — 관심 · 보유 종목이 이 자산군에 없을 때. "없어요"는 찾아본 뒤에만 */
  symbolHint: "이름이나 코드로 찾아 보세요",
  symbolSearching: "찾는 중이에요",
  symbolSearchFailed: "종목을 찾지 못했어요. 다시 적어 보세요",
  sideLabel: "구분",
  quantity: "수량",
  price: "단가",
  priceUnit: "원",
  date: "거래일",
  locked: "종목 · 구분은 고칠 수 없어요. 지우고 다시 적어 주세요.",
  preview: {
    heading: "저장하면",
    quantity: "보유 수량",
    average: "평단",
    invested: "총 취득금액",
    arrow: "→",
    none: "없음",
    idle: "수량 · 단가 · 거래일을 적으면 전후를 보여 드려요",
    loading: "계산하는 중이에요",
    failed: "미리보기를 불러올 수 없습니다. 저장은 할 수 있어요(서버가 다시 확인해요).",
    note: "서버가 거래일 순서대로 다시 계산한 값이에요(선입선출).",
  },
  insufficient: "그 거래일에 가진 수량보다 많이 팔게 돼요. 수량이나 거래일을 고쳐 주세요.",
  invalidAmount: "수량과 단가는 0보다 큰 숫자로 적어 주세요",
  submitCreate: "기록하기",
  submitEdit: "고친 내용 저장",
  submitting: "저장하는 중",
  failed: "지금은 저장하지 못했어요. 입력은 그대로 있어요.",
  notFound: "이미 지워졌거나 찾을 수 없는 기록이에요.",
  savedCreate: "거래를 기록했어요",
  savedEdit: "기록을 고쳤어요",
  deleted: "기록을 지웠어요",
  savedBody: "포지션 · 흐름 · 레이더가 새 기록으로 다시 계산돼요.",
  another: "하나 더 적기",
  close: "닫기",
  delete: {
    open: "이 기록 지우기",
    confirm: "이 기록을 지울까요? 지우면 되돌릴 수 없어요.",
    confirmButton: "지우기",
    deleting: "지우는 중",
    insufficient: "이 매수를 지우면 뒤의 매도가 가진 수량보다 많아져요. 매도를 먼저 고쳐 주세요.",
  },
  signedOut: "로그인하면 거래를 기록할 수 있어요",
} as const;
