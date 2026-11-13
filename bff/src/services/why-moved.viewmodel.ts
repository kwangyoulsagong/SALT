/**
 * 오늘 왜 움직였나 뷰모델 — **순수 함수** (F016 단계 C · `BFF-REQ-051` FR-1).
 *
 * 서버 `GET /api/market/kr/:code/why-moved` · `GET /api/investment/crypto/:symbol/why-moved` 가 다 계산한다
 * (분해 %p · 반올림 · 카드 조건 · 사실 시각순). BFF 가 하는 일:
 *
 * 1. **필드를 골라 옮긴다** — 숫자 계산 0(합 · 차 · 반올림 0). 서버가 칸을 늘려도 화면 계약이 저절로 늘지 않는다
 * 2. **계약이 깨지면 던진다**(`WhyMovedContractError`) — 서비스가 `unavailable` 로 바꾼다. 분해 칸을 0 으로 채우지 않는다
 * 3. **열거값은 아는 것만** — 모르는 사실 kind · 이유는 버린다(화면에 문구가 없다). 분해 `method` 는 모르면 계약 깨짐(라벨이 걸려 있다)
 *
 * ③ 한 줄(`summary` · `gate`, F016 단계 D) — 서버 coach `GET /api/ai-coach/move-summary` 를 같이 읽어 붙인다(`withMoveSummary`).
 * 인용이 이 응답의 사실에 하나라도 없으면 문장을 싣지 않는다(`pending`) — 화면의 `[k]` 칩이 가리킬 줄이 없다.
 */

import { toNewsTagVM, type NewsTagVM } from "./news-tag.viewmodel";

export const MOVE_FACT_KINDS = [
  "news",
  "disclosure",
  "vi",
  "market_action",
  "halt",
  "warning",
  "flow",
  "crypto_news",
  "crypto_warning",
] as const;
export type MoveFactKindVM = (typeof MOVE_FACT_KINDS)[number];

export const MOVE_CARD_REASONS = ["large_move", "vi", "market_action", "halt", "warning"] as const;
export type MoveCardReasonVM = (typeof MOVE_CARD_REASONS)[number];

export const MOVE_SPLIT_METHODS = ["regression", "market_adjusted", "benchmark"] as const;
export type MoveSplitMethodVM = (typeof MOVE_SPLIT_METHODS)[number];

/** ① 분해 — %p(서버가 소수 둘째 자리로). `sector` 가 없으면 두 단(시장 → 종목) */
export interface MoveSplitVM {
  total: number;
  market: number;
  sector: number | null;
  idio: number;
  method: MoveSplitMethodVM;
  /** 시장 기준 — 국내 `0001` · `1001`, 코인 `KRW-BTC` */
  marketIndex: string;
  sectorIndex: string | null;
  /** 업종 이름 — 원천 값(`전기·전자`). 모르면 `null`(화면이 "업종") */
  sectorName: string | null;
}

/** ② 사실 한 줄 — 제목은 원문 그대로(시황 · 기사) 또는 사건 코드(`vi:static:2` · `circuit_breaker:1:down` · `paused`) — 문구는 화면 i18n */
export interface MoveFactVM {
  id: string;
  kind: MoveFactKindVM;
  at: string;
  source: string;
  title: string;
  /** 숫자 사실 — 프로그램 순매수(원) · VI 발동가(원) · 없으면 `null` */
  value: number | null;
  /** 측정 태그(F017 단계 6 · `BFF-REQ-052` FR-5) — 소식만 · 종류를 못 맞히거나 모르는 라벨이면 null */
  tag: NewsTagVM | null;
}

export const MOVE_SUMMARY_GATES = [
  "ok",
  "quiet",
  "pending",
  "no_citation",
  "guard_blocked",
  "no_split",
  "no_card",
  "disabled",
  /** BFF 가 정함 — 서버 ③ 경로를 못 읽음(시간 초과 · 5xx · 계약 깨짐). ①② 는 그대로 */
  "unavailable",
] as const;
export type MoveSummaryGateVM = (typeof MOVE_SUMMARY_GATES)[number];

/** ③ 한 줄 — `[k]` 는 `citations[k-1]`(= `facts[].id`). `ai` 면 화면이 AI 생성 표시를 붙인다(설명 3종 게이트 — `ADR-009` §3) */
export interface MoveSummaryVM {
  text: string;
  citations: string[];
  label: "ai" | "server";
  generatedAt: string | null;
}

export const MOVE_CAUSE_KINDS = ["disclosure", "news", "warning", "listing", "sector", "market", "flow", "none"] as const;
export const MOVE_CAUSE_STRENGTHS = ["likely", "possible", "none"] as const;
export const MOVE_EVIDENCE_KINDS = [
  "post_move",
  "past_reaction",
  "pre_move",
  "idio_share",
  "sector_index",
  "sector_breadth",
  "sector_share",
  "market_index",
  "market_share",
  "program_flow",
  "investor_flow",
  "exchange_flag",
  "listing_age",
  "news_count",
  "usual_range",
] as const;

/** 근거 한 줄 — 사실 + 숫자(`value`, 굵게) · 비교 · 용어 풀이 · 출처 이름 · 시각. `supports` 가 단계를 센 근거 */
export interface MoveEvidenceVM {
  kind: (typeof MOVE_EVIDENCE_KINDS)[number];
  value: string;
  compare: string | null;
  gloss: string | null;
  source: string;
  at: string | null;
  supports: boolean;
}

/** 원인 하나 — 단계는 서버가 받치는 근거 수로 정했다(`SRV-REQ-053` FR-11) */
export interface MoveCauseVM {
  kind: (typeof MOVE_CAUSE_KINDS)[number];
  strength: (typeof MOVE_CAUSE_STRENGTHS)[number];
  headline: string;
  note: string;
  factId: string | null;
  at: string | null;
  evidence: MoveEvidenceVM[];
}

export interface MoveCauseViewVM {
  causes: MoveCauseVM[];
  result: { changeRate: number; text: string; past: string | null };
}

export interface WhyMovedVM {
  /**
   * 원인 → 근거 → 결과(F017 v4 순서 1b · `BFF-REQ-052` FR-6 앞당김). 모양이 깨졌거나 원인이 0 이면 `null` —
   * ①② 는 그대로 나간다(원인 칸만 빠진다). 단계 · 문장을 BFF 가 만들거나 고치지 않는다
   */
  cause: MoveCauseViewVM | null;
  date: string;
  show: boolean;
  reasons: MoveCardReasonVM[];
  /** 평소 하루 변동(%) — 모르면 `null` */
  usualRate: number | null;
  split: MoveSplitVM | null;
  facts: MoveFactVM[];
  unavailable: MoveFactKindVM[];
  summary: MoveSummaryVM | null;
  gate: MoveSummaryGateVM;
}

export class WhyMovedContractError extends Error {
  constructor(field: string) {
    super(`why-moved 응답 계약 깨짐: ${field}`);
    this.name = "WhyMovedContractError";
  }
}

type Raw = Record<string, unknown>;
const obj = (v: unknown, field: string): Raw => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new WhyMovedContractError(field);
  return v as Raw;
};
const str = (r: Raw, k: string): string => {
  if (typeof r[k] !== "string") throw new WhyMovedContractError(k);
  return r[k] as string;
};
const strOrNull = (r: Raw, k: string): string | null => (r[k] === null || r[k] === undefined ? null : str(r, k));
const num = (r: Raw, k: string): number => {
  if (typeof r[k] !== "number" || !Number.isFinite(r[k])) throw new WhyMovedContractError(k);
  return r[k] as number;
};
const numOrNull = (r: Raw, k: string): number | null => (r[k] === null || r[k] === undefined ? null : num(r, k));
const arr = (r: Raw, k: string): unknown[] => {
  if (!Array.isArray(r[k])) throw new WhyMovedContractError(k);
  return r[k] as unknown[];
};
const known = <T extends string>(values: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (values as readonly string[]).includes(v);

const toSplitVM = (raw: unknown): MoveSplitVM | null => {
  if (raw === null || raw === undefined) return null;
  const s = obj(raw, "split");
  const method = s.method;
  if (!known(MOVE_SPLIT_METHODS, method)) throw new WhyMovedContractError("split.method");
  return {
    total: num(s, "total"),
    market: num(s, "market"),
    sector: numOrNull(s, "sector"),
    idio: num(s, "idio"),
    method,
    marketIndex: str(s, "marketIndex"),
    sectorIndex: strOrNull(s, "sectorIndex"),
    sectorName: strOrNull(s, "sectorName"),
  };
};

/**
 * 원인 칸 — 막을 수만 있다. 아는 종류 · 단계만, 단계가 근거와 맞지 않으면(가장 유력인데 받치는 근거 < 2 · 가능성인데 0 ·
 * 원인 아님인데 받침) 그 원인을 버린다. 남은 원인이 0 이면 칸 전체 `null`. 문장은 옮기기만
 */
export const toMoveCauseVM = (raw: unknown): MoveCauseViewVM | null => {
  try {
    if (raw === null || raw === undefined) return null;
    const r = obj(raw, "cause");
    const result = obj(r.result, "cause.result");
    const causes = arr(r, "causes").flatMap((d): MoveCauseVM[] => {
      const c = obj(d, "cause.item");
      if (!known(MOVE_CAUSE_KINDS, c.kind) || !known(MOVE_CAUSE_STRENGTHS, c.strength)) return [];
      const evidence = arr(c, "evidence").flatMap((e): MoveEvidenceVM[] => {
        const v = obj(e, "evidence");
        if (!known(MOVE_EVIDENCE_KINDS, v.kind) || typeof v.supports !== "boolean") return [];
        return [{ kind: v.kind, value: str(v, "value"), compare: strOrNull(v, "compare"), gloss: strOrNull(v, "gloss"), source: str(v, "source"), at: strOrNull(v, "at"), supports: v.supports }];
      });
      const backed = evidence.filter((e) => e.supports).length;
      const consistent = c.strength === "likely" ? backed >= 2 : c.strength === "possible" ? backed >= 1 : backed === 0 && c.kind === "none";
      if (!consistent) return [];
      return [{ kind: c.kind, strength: c.strength, headline: str(c, "headline"), note: str(c, "note"), factId: strOrNull(c, "factId"), at: strOrNull(c, "at"), evidence }];
    });
    if (causes.length === 0) return null;
    return { causes, result: { changeRate: num(result, "changeRate"), text: str(result, "text"), past: strOrNull(result, "past") } };
  } catch (error) {
    if (error instanceof WhyMovedContractError) return null;
    throw error;
  }
};

/** 서버 `data` → 화면 계약. 국내 · 코인 같은 모양 */
export const toWhyMovedVM = (raw: unknown): Omit<WhyMovedVM, "summary" | "gate"> => {
  const r = obj(raw, "data");
  if (typeof r.show !== "boolean") throw new WhyMovedContractError("show");
  return {
    cause: toMoveCauseVM(r.cause),
    date: str(r, "date"),
    show: r.show,
    reasons: arr(r, "reasons").filter((x): x is MoveCardReasonVM => known(MOVE_CARD_REASONS, x)),
    usualRate: numOrNull(r, "usualRate"),
    split: toSplitVM(r.split),
    facts: arr(r, "facts").flatMap((d): MoveFactVM[] => {
      const f = obj(d, "fact");
      if (!known(MOVE_FACT_KINDS, f.kind)) return [];
      return [{ id: str(f, "id"), kind: f.kind, at: str(f, "at"), source: str(f, "source"), title: str(f, "title"), value: numOrNull(f, "value"), tag: toNewsTagVM(f.tag) }];
    }),
    unavailable: arr(r, "unavailable").filter((x): x is MoveFactKindVM => known(MOVE_FACT_KINDS, x)),
  };
};

/** 서버 ③ 응답 → `{summary, gate}`. 모르는 gate · 깨진 모양은 계약 깨짐(서비스가 `unavailable` 로) */
export const toMoveSummaryVM = (raw: unknown): { summary: MoveSummaryVM | null; gate: MoveSummaryGateVM } => {
  const r = obj(raw, "data");
  if (!known(MOVE_SUMMARY_GATES, r.gate) || r.gate === "unavailable") throw new WhyMovedContractError("gate");
  if (r.summary === null || r.summary === undefined) return { summary: null, gate: r.gate };
  const s = obj(r.summary, "summary");
  const label = s.label;
  if (label !== "ai" && label !== "server") throw new WhyMovedContractError("summary.label");
  const citations = arr(s, "citations").map((c) => {
    if (typeof c !== "string") throw new WhyMovedContractError("summary.citations");
    return c;
  });
  return { summary: { text: str(s, "text"), citations, label, generatedAt: strOrNull(s, "generatedAt") }, gate: r.gate };
};

/**
 * ①② 응답에 ③을 붙인다 — 인용이 지금 사실 목록에 다 있을 때만 문장을 싣는다. 하나라도 없으면 `pending`
 * (두 경로를 따로 읽는 사이 사실이 바뀐 경우 — 다음 요청에 맞는다). `ai` 인데 인용 0 이면 게이트 위반이라 싣지 않는다
 */
export const withMoveSummary = (
  card: Omit<WhyMovedVM, "summary" | "gate">,
  third: { summary: MoveSummaryVM | null; gate: MoveSummaryGateVM },
): WhyMovedVM => {
  const s = third.summary;
  if (!s) return { ...card, summary: null, gate: third.gate };
  const ids = new Set(card.facts.map((f) => f.id));
  const cited = s.citations.every((id) => ids.has(id));
  if (s.label === "ai" && (s.citations.length === 0 || !cited)) return { ...card, summary: null, gate: "pending" };
  return { ...card, summary: s, gate: third.gate };
};
