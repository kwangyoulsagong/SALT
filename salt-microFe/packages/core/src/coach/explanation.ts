/**
 * 종목 해설 — BFF `GET /api/app/ai-coach/explanation` 뷰모델(F017 v2 단계 3 · `BFF-REQ-052` FR-2 · `FE-REQ-064` FR-2).
 * 정의 원본은 `bff/src/services/explanation.viewmodel.ts` — 모양을 바꾸면 둘을 같이 바꾼다.
 *
 * 서버가 미리 만든 해설(배치)을 읽기만 한다 — 4단 중 하나, 문장은 늘 하나 이상, 문장마다 인용 하나 이상.
 * 예전 즉석 스트림(`POST /explain/stream`)은 2026-11-11 지웠다.
 */

/** `latest` 최신 AI · `previous` 이전 AI(만든 시각을 같이) · `template` 사실표 문장(AI 표시 없음) · `none` 특이 소식 없음 + 판단 근거 */
export type ExplanationTier = "latest" | "previous" | "template" | "none";
export type ExplainSection = "modeReasoning" | "keyDrivers" | "risks" | "newsSummary";
/** 누가 썼나 — AI 단만. 아니면 `null` */
export type ExplainProvider = "local_claude" | "local_codex" | "gemini";

/** 문장이 기댄 사실 — 번호 칩을 누르면 이 이름 · 시각(· 기사 주소). `url` 은 BFF 가 `http(s)` 만 남긴다 */
export interface ExplanationCitation {
  id: string;
  label: string;
  at: string | null;
  url: string | null;
}

export interface ExplanationSentence {
  section: ExplainSection;
  text: string;
  citations: ExplanationCitation[];
}

export interface SymbolExplanation {
  symbol: string;
  mode: "scalp" | "long_term";
  tier: ExplanationTier;
  aiGenerated: boolean;
  provider: ExplainProvider | null;
  generatedAt: string;
  sentences: ExplanationSentence[];
  disclaimer: string;
}
