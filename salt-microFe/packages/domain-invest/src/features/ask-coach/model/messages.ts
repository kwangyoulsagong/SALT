import { CoachQuestionChip, type CoachAnswerLinkKind } from "@repo/core/coach";

/**
 * 코치 대화 문구(F006 C절 · `FE-REQ-030` · `031`). 답 문장은 서버 규칙 문장 그대로 — 여기엔 화면 틀 문구만.
 * 칩 문구는 서버 `COACH_CHIP_QUESTION` 과 같다(칩만 누르면 서버가 같은 문장을 질문으로 저장한다).
 */
export const ASK_COACH_MESSAGES = {
  intro: "보유 · 위험 예산 · 거래 기록으로 계산한 숫자로 답해요. 주문은 내지 않아요.",
  chipsLabel: "자주 묻는 질문",
  inputLabel: "코치에게 묻기",
  placeholder: "예: 내 포트폴리오 위험한가?",
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
  disclaimer: "숫자는 기록과 정해 둔 기준으로 계산한 과거 · 현재 사실이에요. 앞으로의 가격을 말하지 않아요.",
  links: "더 보기",
  briefingTitle: "오늘의 브리핑",
  briefingLoading: "브리핑을 모으는 중",
  briefingFailed: "오늘의 브리핑을 불러오지 못했어요. 아래 질문으로 바로 물어볼 수 있어요.",
  loadOlder: "이전 대화 더 보기",
  loadingOlder: "이전 대화를 불러오는 중",
  newMessage: "새 답 보기",
  /** 생성 시각(FEATURE-006 FR-27) — 서울 시각 */
  generatedAt: (time: string) => `${time} 계산`,
  cardJudgedAt: (time: string) => `이 판단을 만든 때 ${time}`,
  /** 같은 카드가 위에 이미 있을 때 — 한 화면에 같은 숫자 두 번 금지(`screen-desktop.md` §5) */
  sameCardAbove: (time: string) => `카드는 위에 붙인 것과 같은 판단이에요${time ? `(${time})` : ""}.`,
} as const;

export const COACH_CHIP_LABEL: Record<CoachQuestionChip, string> = {
  [CoachQuestionChip.SellCheck]: "지금 팔 때인가?",
  [CoachQuestionChip.WeeklyAmount]: "이번 주 얼마 넣을까?",
  [CoachQuestionChip.RiskCheck]: "내 포트폴리오 위험한가?",
  [CoachQuestionChip.MistakeReview]: "내가 뭘 잘못했나?",
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
};
export const coachSymbolLinkLabel = (symbol: string) => `${symbol} 상세 보기`;

/** 질문 길이 상한 — 서버 `COACH_QUESTION_MAX_LENGTH` 와 같다 */
export const COACH_QUESTION_MAX_LENGTH = 500;
