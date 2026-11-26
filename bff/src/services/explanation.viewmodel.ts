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

/** 지난 날 해설 한 벌의 판정 — 서버 `ModeDecisionAction` 넷 */
export type ExplanationDayAction = "review_short_opportunity" | "review_accumulation" | "wait" | "avoid";
const DAY_ACTIONS: readonly ExplanationDayAction[] = ["review_short_opportunity", "review_accumulation", "wait", "avoid"];

/**
 * 지난 날 해설 한 벌(`BFF-REQ-057`) — 그날 저장한 **원문 그대로**. 지금 데이터로 다시 쓰지 않는다(사후 지식 0).
 * 등락률은 서버가 일봉으로 계산한 값(%) — 화면은 표시만
 */
export interface ExplanationDayViewModel {
  /** KST 날짜 `YYYY-MM-DD` */
  tradeDay: string;
  generatedAt: string;
  action: ExplanationDayAction;
  provider: ExplanationProvider;
  sentences: ExplanationSentence[];
  /** 그날 종가의 전일 대비 % — 일봉이 없으면 `null` */
  dayChangeRate: number | null;
  /** 그날 종가 → 지금 가격 % — 없으면 `null` */
  changeSinceRate: number | null;
}

export interface ExplanationHistoryViewModel {
  symbol: string;
  mode: "scalp" | "long_term";
  disclaimer: string;
  /** 최신 먼저 · 오늘(KST) 이전만. 비어 있어도 정상(아직 쌓인 날이 없다) */
  days: ExplanationDayViewModel[];
}

const rate = (v: unknown, field: string): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ExplanationContractError(field);
  return v;
};

const toExplanationDay = (raw: unknown): ExplanationDayViewModel => {
  if (!isObject(raw)) throw new ExplanationContractError("day");
  const tradeDay = str(raw.tradeDay, "day.tradeDay");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDay)) throw new ExplanationContractError("day.tradeDay");
  if (!DAY_ACTIONS.includes(raw.action as ExplanationDayAction)) throw new ExplanationContractError("day.action");
  if (!PROVIDERS.includes(raw.provider as ExplanationProvider)) throw new ExplanationContractError("day.provider");
  if (!Array.isArray(raw.sentences) || raw.sentences.length === 0) throw new ExplanationContractError("day.sentences");
  return {
    tradeDay,
    generatedAt: str(raw.generatedAt, "day.generatedAt"),
    action: raw.action as ExplanationDayAction,
    provider: raw.provider as ExplanationProvider,
    // 성적 · 틀렸던 때 칸은 지금 값이라 지난 날에 싣지 않는다 — 서버가 이미 빼지만 한 번 더
    sentences: raw.sentences.map(toExplanationSentence).filter((s) => s.section !== "track" && s.section !== "miss"),
    dayChangeRate: rate(raw.dayChangeRate, "day.dayChangeRate"),
    changeSinceRate: rate(raw.changeSinceRate, "day.changeSinceRate"),
  };
};

/** 지난 날 해설 목록 — 모양이 깨졌으면 `ExplanationContractError`(502). 빈 `days` 는 정상 */
export const toExplanationHistoryViewModel = (raw: unknown): ExplanationHistoryViewModel => {
  if (!isObject(raw)) throw new ExplanationContractError("history");
  if (raw.mode !== "scalp" && raw.mode !== "long_term") throw new ExplanationContractError("history.mode");
  if (!Array.isArray(raw.days)) throw new ExplanationContractError("history.days");
  return {
    symbol: str(raw.symbol, "history.symbol"),
    mode: raw.mode,
    disclaimer: typeof raw.disclaimer === "string" ? raw.disclaimer : "",
    days: raw.days.map(toExplanationDay),
  };
};
