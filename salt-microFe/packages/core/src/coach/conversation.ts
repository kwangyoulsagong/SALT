import type { ReportRecommendation } from "./coachReport";

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

/** 답 아래 화면 이동 코드 — 경로는 화면이 정한다. `plan` = 밴드 적립(2026-11-19 — 서버 · BFF 목록과 같이) */
export type CoachAnswerLinkKind = "risk_budget" | "profit_plan" | "behavior_mirror" | "size_check" | "symbol" | "plan";
export interface CoachAnswerLink {
  kind: CoachAnswerLinkKind;
  symbol?: string;
}

/**
 * 답 · 브리핑에 붙는 저장 추천 카드(F006 2단계 · `FE-REQ-032` FR-52) — 코치 리포트 추천과 **같은 타입**이라
 * `RecommendationCard` 를 그대로 쓴다(게이트는 카드 자신이). `generatedAt` = 그 판단을 만든 시각(FEATURE-006 FR-27)
 */
export type CoachCard = ReportRecommendation & { generatedAt: string | null };

/** 오늘의 브리핑 — 대화 첫 메시지(FEATURE-006 FR-21). 저장되지 않는다 */
export interface CoachBriefing {
  generatedAt: string;
  sentences: string[];
  source: "rule" | "llm";
  links: CoachAnswerLink[];
  gaps: string[];
  card: CoachCard | null;
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
  /** 답에 붙은 카드 — 그 시점 사본(추천이 바뀌어도 그대로). 질문 · 카드 없는 답은 `null` */
  card: CoachCard | null;
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
  /** 보관 한도 — 메시지 목록에만(서버 상수 · `SRV-REQ-029` FR-30). 없거나 모양이 틀리면 `null` — 화면은 그 줄을 안 그린다 */
  keep?: CoachHistoryKeep | null;
}

/** 코치 대화 보관 한도 — 최근 질문 `questions` 개 · `days` 일 중 먼저 닿는 쪽까지(2026-11-19 사용자 "너무 쌓이면 안 되니까") */
export interface CoachHistoryKeep {
  questions: number;
  days: number;
}

export interface CoachAskResult {
  conversationId: string;
  messageId: string;
}

/** 같은 판단의 카드인가 — 판단 시각 · 통과 여부 · 종목(막히면 사유)이 같으면 같은 카드다 */
const cardKey = (card: CoachCard): string =>
  card.renderable
    ? `ok|${card.generatedAt ?? ""}|${card.symbol}|${card.action}`
    : `blocked|${card.generatedAt ?? ""}|${card.blockedReason}`;

/** 두 카드가 같은 판단인가(`firstCardHolders` 와 같은 열쇠) — PC 격자에서 옆 칸 카드와 대화 안 카드를 맞출 때 */
export const isSameCard = (a: CoachCard, b: CoachCard): boolean => cardKey(a) === cardKey(b);

/**
 * 한 화면에 같은 카드는 한 번만(`screen-desktop.md` §5 "같은 숫자 두 번" — F006 2단계 실화면에서 지난 답 · 브리핑 · 새 답에
 * 같은 카드가 세 번 나왔다). 위에서부터 처음 나온 자리의 id 만 돌려준다 — 나머지 자리는 한 줄로 가리킨다.
 * 순서는 화면 순서 그대로 넘긴다(위로 더 읽기로 오래된 쪽이 붙으면 처음 자리가 그쪽으로 옮겨 간다)
 */
export const firstCardHolders = (items: ReadonlyArray<{ id: string; card: CoachCard | null }>): Set<string> => {
  const seen = new Set<string>();
  const first = new Set<string>();
  for (const item of items) {
    if (!item.card) continue;
    const key = cardKey(item.card);
    if (seen.has(key)) continue;
    seen.add(key);
    first.add(item.id);
  }
  return first;
};

/**
 * PC 패널 배치(F006 A절 · `BFF-REQ-028` `GET /api/app/coach/panel-layout`). `tree` 모양은 `@repo/ui/layoutTree` `parseLayout` 이
 * 판정한다 — BFF · 서버는 객체인지 · 크기만 본다. `degraded` = 서버에서 못 읽음(화면은 기본 배치)
 */
export interface PanelLayoutResult {
  tree: Record<string, unknown> | null;
  updatedAt: string | null;
  degraded: boolean;
}

/**
 * 지난 대화 다음 쪽 커서(`FE-REQ-031` FR-20 · 2026-11-19) — 이미 쓴 커서가 다시 오면 `null`(멈춤).
 * 서버 · BFF 가 커서를 잃으면 첫 쪽이 되풀이돼 위로 끝없이 같은 쪽이 붙었다(실측 41쪽에 메시지 60개)
 */
export const nextHistoryCursor = (page: Pick<CoachConversationPage<unknown>, "nextCursor">, usedCursors: readonly (string | null)[]): string | null =>
  page.nextCursor && !usedCursors.includes(page.nextCursor) ? page.nextCursor : null;

/**
 * 쪽들(최신 쪽이 앞 · 쪽 안도 최신이 앞)을 화면 순서(오래된 것이 위)로 펴고 같은 id 는 한 번만 — React 키가 겹치면 줄이 빠지거나 두 번 그려진다
 */
export const mergeHistoryPages = <T extends { id: string }>(pages: readonly Pick<CoachConversationPage<T>, "items">[]): T[] => {
  const seen = new Set<string>();
  return [...pages]
    .reverse()
    .flatMap((page) => [...page.items].reverse())
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
};
