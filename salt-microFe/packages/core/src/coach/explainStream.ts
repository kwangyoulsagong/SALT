/**
 * 해설 스트림 이벤트 — BFF `POST /api/app/ai-coach/explain/stream` (F008 `BFF-REQ-037` FR-6 · `SRV-REQ-037` FR-8).
 *
 * 흐르는 글자(`delta`)는 둘 중 하나다 — ① **템플릿** 문장(입력 사실로만 만들어 숫자를 지어낼 수 없다) 뒤에 검증을 통과한
 * LLM 문장이 `replace` 로 한 번에 온다(Gemini · Codex), ② 토큰 스트림 공급자(로컬 Claude)는 서버가 **문장마다 검증한 뒤**
 * 바로 `delta` 로 흘리고, 빈 칸만 끝에 `replace` 한다(`SRV-REQ-050` FR-13). 어느 쪽이든 검사 전 원문 LLM 토큰은 이 계약에 없다(FEATURE-008 FR-47).
 */
export type ExplainStep = "judgment" | "draft" | "polish" | "verify";
export type ExplainStepStatus = "active" | "done" | "skipped";
export type ExplainSection = "modeReasoning" | "keyDrivers" | "risks" | "newsSummary";
/** `llm` 통과 · `llm_checked` 일부 문장을 걸러 템플릿으로 채움 · `template` LLM 실패 */
export type ExplanationSource = "llm" | "llm_checked" | "template";
/** 누가 다듬었나(`BFF-REQ-050` FR-3) — 템플릿이면 `null`, 옛 서버면 칸이 없다(`undefined`) */
export type ExplainProvider = "local_claude" | "local_codex" | "gemini";

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
  | {
      event: "message.step";
      /** `provider` — 토큰 스트림 시작(`polish:active`) 때만. 끊겨도 흘린 문장의 출처를 안다 */
      data: { step: ExplainStep; status: ExplainStepStatus; provider?: ExplainProvider };
    }
  | { event: "message.blocked"; data: { blockedReason: string } }
  | { event: "message.card"; data: { disclaimer: string; citations: ExplainCitation[] } }
  | { event: "message.delta"; data: { section: ExplainSection; index: number; text: string } }
  | {
      event: "message.replace";
      data: ExplainSections & { source: ExplanationSource; droppedSentences: number; provider?: ExplainProvider | null };
    }
  | {
      event: "message.done";
      data: {
        messageId: string;
        source: ExplanationSource;
        droppedSentences: number;
        provider?: ExplainProvider | null;
        generatedAt: string;
      };
    }
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
