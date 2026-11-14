/**
 * 종목 해설 뷰모델 — **순수 함수**(F017 v2 단계 3 · `BFF-REQ-052` FR-2).
 *
 * 서버 해설 4단(패널 응답 `modes.*.explanation.view` — 칸별 BFF 경로는 2026-11-13 은퇴, F017 v4 1e) 그대로 — 문장 · 인용 · 단을 고치지 않는다. 캐시 0(서버가 저장값을 읽는다).
 * 모양이 깨졌으면 `ExplanationContractError` — 빈 문장을 지어내지 않는다(빈 칸 0 은 서버가 지킨다).
 * 인용 주소는 `http(s)` 만 남긴다 — 서버가 이미 거르지만 화면이 링크로 여는 값이라 한 번 더(`citableUrl` 과 같은 선)
 */

export type ExplanationTier = "latest" | "previous" | "template" | "none";
/** `track` · `miss` — 서버가 판단 블록 값으로 쓴 "얼마나 믿을까" · "틀렸던 때"(F017 v4 순서 1c). 늘 맨 뒤 */
export type ExplanationSection = "modeReasoning" | "keyDrivers" | "risks" | "newsSummary" | "track" | "miss";
export type ExplanationProvider = "local_claude" | "local_codex" | "gemini";

export interface ExplanationCitation {
  id: string;
  label: string;
  at: string | null;
  url: string | null;
}

export interface ExplanationSentence {
  section: ExplanationSection;
  text: string;
  citations: ExplanationCitation[];
}

export interface ExplanationViewModel {
  symbol: string;
  mode: "scalp" | "long_term";
  tier: ExplanationTier;
  aiGenerated: boolean;
  provider: ExplanationProvider | null;
  generatedAt: string;
  sentences: ExplanationSentence[];
  disclaimer: string;
}

export class ExplanationContractError extends Error {
  constructor(field: string) {
    super(`explanation contract: ${field}`);
    this.name = "ExplanationContractError";
  }
}

const TIERS: readonly ExplanationTier[] = ["latest", "previous", "template", "none"];
const SECTIONS: readonly ExplanationSection[] = ["modeReasoning", "keyDrivers", "risks", "newsSummary", "track", "miss"];
const PROVIDERS: readonly ExplanationProvider[] = ["local_claude", "local_codex", "gemini"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, field: string): string => {
  if (typeof v !== "string" || v.length === 0) throw new ExplanationContractError(field);
  return v;
};

/** http(s) 주소만 — 화면이 링크로 그린다(`javascript:` 0). 회사 사정 칸 출처(`coach-panel.viewmodel`)도 같이 쓴다 */
export const safeUrl = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  try {
    const { protocol } = new URL(v);
    return protocol === "https:" || protocol === "http:" ? v : null;
  } catch {
    return null;
  }
};

const toCitation = (raw: unknown): ExplanationCitation => {
  if (!isObject(raw)) throw new ExplanationContractError("citation");
  return {
    id: str(raw.id, "citation.id"),
    label: str(raw.label, "citation.label"),
    at: typeof raw.at === "string" ? raw.at : null,
    url: safeUrl(raw.url),
  };
};

/** 문장 하나 — 스트림 `sentence` 이벤트도 같은 검사(F017 v4 1f · `BFF-REQ-052` FR-7) */
export const toExplanationSentence = (raw: unknown): ExplanationSentence => {
  if (!isObject(raw)) throw new ExplanationContractError("sentence");
  if (!SECTIONS.includes(raw.section as ExplanationSection)) throw new ExplanationContractError("sentence.section");
  if (!Array.isArray(raw.citations) || raw.citations.length === 0) throw new ExplanationContractError("sentence.citations");
  return {
    section: raw.section as ExplanationSection,
    text: str(raw.text, "sentence.text"),
    citations: raw.citations.map(toCitation),
  };
};

export const toExplanationViewModel = (raw: unknown): ExplanationViewModel => {
  if (!isObject(raw)) throw new ExplanationContractError("body");
  if (!TIERS.includes(raw.tier as ExplanationTier)) throw new ExplanationContractError("tier");
  if (raw.mode !== "scalp" && raw.mode !== "long_term") throw new ExplanationContractError("mode");
  if (!Array.isArray(raw.sentences) || raw.sentences.length === 0) throw new ExplanationContractError("sentences");
  const provider = raw.provider === null || raw.provider === undefined ? null : raw.provider;
  if (provider !== null && !PROVIDERS.includes(provider as ExplanationProvider)) throw new ExplanationContractError("provider");
  return {
    symbol: str(raw.symbol, "symbol"),
    mode: raw.mode,
    tier: raw.tier as ExplanationTier,
    aiGenerated: raw.aiGenerated === true,
    provider: provider as ExplanationProvider | null,
    generatedAt: str(raw.generatedAt, "generatedAt"),
    sentences: raw.sentences.map(toExplanationSentence),
    disclaimer: typeof raw.disclaimer === "string" ? raw.disclaimer : "",
  };
};
