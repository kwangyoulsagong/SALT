/**
 * 코치 대화 뷰모델(F006 C절 · `BFF-REQ-028`) — BFF `services/coach-conversation.service.ts` 와 같은 모양.
 * 문장 · 숫자는 서버 규칙 답 그대로다 — 화면은 표시만 한다(공통 수용 기준 3).
 */

/** 추천 질문 칩 넷(FEATURE-006 FR-22) — 서버 `COACH_QUESTION_CHIPS` 와 같은 코드 */
export enum CoachQuestionChip {
  SellCheck = "sell_check",
  WeeklyAmount = "weekly_amount",
  RiskCheck = "risk_check",
  MistakeReview = "mistake_review",
}

/** 답 아래 화면 이동 코드 — 경로는 화면이 정한다 */
export type CoachAnswerLinkKind = "risk_budget" | "profit_plan" | "behavior_mirror" | "size_check" | "symbol";
export interface CoachAnswerLink {
  kind: CoachAnswerLinkKind;
  symbol?: string;
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  sentences: string[];
  status: "streaming" | "complete" | "failed";
  /** 규칙 문장(`rule`) · AI 문장(`llm`). 질문은 `null` */
  source: "rule" | "llm" | null;
  links: CoachAnswerLink[];
  gaps: string[];
  errorCode: string | null;
  createdAt: string;
}

export interface CoachConversationItem {
  id: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string;
}

export interface CoachConversationPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CoachAskResult {
  conversationId: string;
  messageId: string;
}
