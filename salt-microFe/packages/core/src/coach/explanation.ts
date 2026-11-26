/**
 * 종목 해설 — BFF 한 장 패널 `GET /api/app/ai-coach/panel` 의 `modes.*.explanation.view`(F017 v2 단계 3 · v4 1e · `BFF-REQ-052` FR-2 · FR-6 · `FE-REQ-064` FR-10). 칸별 경로 `/explanation` 은 2026-11-13 은퇴.
 * 정의 원본은 `bff/src/services/explanation.viewmodel.ts` — 모양을 바꾸면 둘을 같이 바꾼다.
 *
 * 서버가 미리 만든 해설(배치)을 읽기만 한다 — 4단 중 하나, 문장은 늘 하나 이상, 문장마다 인용 하나 이상.
 * 예전 즉석 스트림(`POST /explain/stream`)은 2026-11-11 지웠다.
 */

/** `latest` 최신 AI · `previous` 이전 AI(만든 시각을 같이) · `template` 사실표 문장(AI 표시 없음) · `none` 특이 소식 없음 + 판단 근거 */
export type ExplanationTier = "latest" | "previous" | "template" | "none";
/** `track` · `miss` — 서버가 판단 블록 값으로 쓴 "얼마나 믿을까" · "틀렸던 때"(F017 v4 순서 1c, LLM 0). 늘 맨 뒤 */
export type ExplainSection = "modeReasoning" | "keyDrivers" | "risks" | "newsSummary" | "track" | "miss";
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

/** 지난 날 해설의 그날 판정 — 서버 `ModeDecisionAction` 넷 */
export type ExplanationDayAction = "review_short_opportunity" | "review_accumulation" | "wait" | "avoid";

/**
 * 지난 날 해설 한 벌 — BFF `GET /api/app/ai-coach/explanation/history`(`BFF-REQ-057` · `FE-REQ-079`).
 * 정의 원본은 `bff/src/services/explanation.viewmodel.ts` `ExplanationDayViewModel`.
 * 그날 저장한 **원문 그대로**다 — 지금 데이터로 다시 쓰지 않는다. 등락률(%)은 서버가 일봉으로 계산한 값, 화면은 표시만
 */
export interface ExplanationDay {
  /** KST 날짜 `YYYY-MM-DD` */
  tradeDay: string;
  /** 그 해설을 만든 시각(ISO) — "몇 시 기준"으로 보인다 */
  generatedAt: string;
  action: ExplanationDayAction;
  provider: ExplainProvider;
  /** 성적 · 틀렸던 때 칸은 없다(지금 값이라) */
  sentences: ExplanationSentence[];
  /** 그날 종가의 전일 대비 % · 일봉이 없으면 `null` */
  dayChangeRate: number | null;
  /** 그날 종가 → 지금 가격 % · 없으면 `null` */
  changeSinceRate: number | null;
}

export interface ExplanationHistory {
  symbol: string;
  mode: "scalp" | "long_term";
  disclaimer: string;
  /** 최신 먼저 · 오늘(KST) 이전만. 빈 배열 = 아직 쌓인 날이 없다 */
  days: ExplanationDay[];
}
