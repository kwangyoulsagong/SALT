import { CoachQuestionChip, type CoachAnswerLinkKind } from "@repo/core/coach";

/**
 * 코치 대화 문구(F006 C절 · `FE-REQ-030` · `031`). 답 문장은 서버 규칙 문장 그대로 — 여기엔 화면 틀 문구만.
 * 칩 문구는 서버 `COACH_CHIP_QUESTION` 과 같다(칩만 누르면 서버가 같은 문장을 질문으로 저장한다).
 */
export const ASK_COACH_MESSAGES = {
  chipsLabel: "자주 묻는 질문",
  followUpsLabel: "이어서 물어보기",
  logLabel: "코치 대화",
  inputLabel: "코치에게 묻기",
  placeholder: "보유 · 위험 예산 기준으로 물어보세요",
  send: "보내기",
  sending: "보내는 중",
  sourceRule: "규칙 계산",
  sourceLlm: "AI 문장",
  answering: "계산하는 중",
  failed: "답을 만들지 못했어요. 같은 질문을 다시 보내면 처음부터 계산해요.",
  sendFailed: "질문을 보내지 못했어요. 입력한 글은 그대로 있어요.",
  sendBusy: "질문이 잠깐 많았어요. 조금 뒤 다시 보내면 돼요. 입력한 글은 그대로 있어요.",
  reconnecting: "연결 중",
  streamLost: "답을 받는 중에 연결이 끊겼어요. 같은 답을 다시 받을 수 있어요.",
  retry: "다시 받기",
  historyFailed: "지난 대화를 불러오지 못했어요. 새로 물어볼 수는 있어요.",
  signedOut: "로그인하면 코치에게 물어볼 수 있어요.",
  /** 위(소개) · 아래(면책) 두 줄을 입력 아래 한 줄로 합쳤다(2026-11-19 재설계) */
  disclaimer: "보유 · 위험 예산 · 거래 기록으로 계산한 과거 · 현재 숫자예요. 앞으로의 가격을 말하지 않고, 주문은 내지 않아요.",
  links: "더 보기",
  briefingTitle: "오늘의 브리핑",
  briefingLoading: "브리핑을 모으는 중",
  briefingFailed: "오늘의 브리핑을 불러오지 못했어요. 아래 질문으로 바로 물어볼 수 있어요.",
  loadOlder: "이전 대화 더 보기",
  loadingOlder: "이전 대화를 불러오는 중",
  /** 지난 쪽 실패 — 저절로 다시 부르지 않는다(버튼만) */
  olderFailed: "이전 대화를 불러오지 못했어요.",
  retryOlder: "다시 불러오기",
  /** 맨 위(더 없음) 한 줄 — 숫자는 서버 보관 한도(`SRV-REQ-029` FR-30) */
  keepNote: (questions: number, days: number) => `대화는 최근 질문 ${questions}개 · ${days}일까지만 보관해요. 그보다 오래된 대화는 지워져요.`,
  newMessage: "새 답 보기",
  /** 생성 시각(FEATURE-006 FR-27) — 서울 시각 */
  generatedAt: (time: string) => `${time} 계산`,
  cardJudgedAt: (time: string) => `이 판단을 만든 때 ${time}`,
  /** 같은 카드가 위에 이미 있을 때 — 한 화면에 같은 숫자 두 번 금지(`screen-desktop.md` §5) */
  sameCardAbove: (time: string) => `카드는 위에 붙인 것과 같은 판단이에요${time ? `(${time})` : ""}.`,
  /** 같은 카드가 사이드 "오늘의 추천"에 펼쳐져 있다 */
  sameCardAside: (time: string) => `카드는 오늘의 추천 칸과 같은 판단이에요${time ? `(${time})` : ""}.`,
} as const;

export const COACH_CHIP_LABEL: Record<CoachQuestionChip, string> = {
  [CoachQuestionChip.SellCheck]: "지금 팔 때인가?",
  [CoachQuestionChip.WeeklyAmount]: "이번 주 얼마 넣을까?",
  [CoachQuestionChip.RiskCheck]: "내 포트폴리오 위험한가?",
  [CoachQuestionChip.MistakeReview]: "내가 뭘 잘못했나?",
};

/** 시작 질문 한 줄 설명(2026-11-20) — 무엇으로 답하는지만(지시형 0) */
export const COACH_CHIP_HINT: Record<CoachQuestionChip, string> = {
  [CoachQuestionChip.SellCheck]: "보유와 코치 판단으로 점검해요",
  [CoachQuestionChip.WeeklyAmount]: "밴드 적립 이번 주 계획으로 답해요",
  [CoachQuestionChip.RiskCheck]: "내 손실 기준과 지금 보유를 비교해요",
  [CoachQuestionChip.MistakeReview]: "지난 거래 기록을 돌아봐요",
};

export const COACH_CHIPS: readonly CoachQuestionChip[] = [
  CoachQuestionChip.SellCheck,
  CoachQuestionChip.WeeklyAmount,
  CoachQuestionChip.RiskCheck,
  CoachQuestionChip.MistakeReview,
];

export const COACH_LINK_LABEL: Record<Exclude<CoachAnswerLinkKind, "symbol">, string> = {
  risk_budget: "위험 예산 보기",
  profit_plan: "포트폴리오 보기",
  behavior_mirror: "매매 거울 보기",
  size_check: "내 손실 한도 보기",
  plan: "적립 화면 보기",
};
export const coachSymbolLinkLabel = (symbol: string) => `${symbol} 상세 보기`;

/** 글자 수는 이만큼 넘을 때만 보인다 — 늘 보이는 0 / 500 은 잡음(리서치 2026-11-19) */
export const COACH_COUNTER_FROM = 400;
/** 대화 중 이어 묻기 칩 수 — 방금 물은 것은 뺀다 */
export const COACH_FOLLOW_UP_MAX = 3;

/** 질문 길이 상한 — 서버 `COACH_QUESTION_MAX_LENGTH` 와 같다 */
export const COACH_QUESTION_MAX_LENGTH = 500;
