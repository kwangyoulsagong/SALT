/**
 * 해설 스트림 이벤트 — BFF `POST /api/app/ai-coach/explain/stream` (F008 `BFF-REQ-037` FR-6 · `SRV-REQ-037` FR-8).
 *
 * 흐르는 글자(`delta`)는 **템플릿** 문장이다 — 입력 사실로만 만들어 숫자를 지어낼 수 없다. LLM 문장은
 * 서버 검증을 통과한 뒤 `replace` 로 한 번에 온다. 원문 LLM 토큰은 이 계약에 없다(FEATURE-008 FR-47).
 */
export type ExplainStep = "judgment" | "draft" | "polish" | "verify";
export type ExplainStepStatus = "active" | "done" | "skipped";
export type ExplainSection = "modeReasoning" | "keyDrivers" | "risks" | "newsSummary";
/** `llm` 통과 · `llm_checked` 일부 문장을 걸러 템플릿으로 채움 · `template` LLM 실패 */
export type ExplanationSource = "llm" | "llm_checked" | "template";

/**
 * 해설에 들어간 기사의 출처(FEATURE-008 FR-44). `url` 은 서버가 `http(s)` 만 싣는다 — 없으면 이름만 그린다.
 * `publishedAt` 은 기사 게시 시각(ISO). 시각 문구는 클라이언트가 만든다(서버에서 만들면 굳는다)
 */
export interface ExplainCitation {
  title: string;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
}

export interface ExplainSections {
  modeReasoning: string;
  keyDrivers: string[];
  risks: string[];
  newsSummary: string[];
}

export type ExplainStreamEvent =
  | { event: "message.start"; data: { messageId: string; createdAt: string } }
  | { event: "message.step"; data: { step: ExplainStep; status: ExplainStepStatus } }
  | { event: "message.blocked"; data: { blockedReason: string } }
  | { event: "message.card"; data: { disclaimer: string; citations: ExplainCitation[] } }
  | { event: "message.delta"; data: { section: ExplainSection; index: number; text: string } }
  | { event: "message.replace"; data: ExplainSections & { source: ExplanationSource; droppedSentences: number } }
  | { event: "message.done"; data: { messageId: string; source: ExplanationSource; droppedSentences: number; generatedAt: string } }
  | { event: "message.error"; data: { code: string; fallback: "rule" } };

export const EXPLAIN_STREAM_EVENT_NAMES: ReadonlySet<ExplainStreamEvent["event"]> = new Set([
  "message.start",
  "message.step",
  "message.blocked",
  "message.card",
  "message.delta",
  "message.replace",
  "message.done",
  "message.error",
]);
