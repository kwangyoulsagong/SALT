import type { NewsTag } from "./newsTag";

/**
 * 오늘 왜 움직였나 — 화면 계약(F016 단계 C · `BFF-REQ-051` FR-1 · `FE-REQ-063` FR-1). BFF `services/why-moved.viewmodel.ts` 와 같은 모양.
 *
 * 값 · 보일지(`show`)는 전부 서버가 정한다(프론트 상수 0). 분해는 %p — 화면은 부호 · 자리만 그린다.
 * ③ 한 줄(`summary` · `gate`, F016 단계 D) — 같은 날 사실만 `[k]` 로 인용하는 문장. `[k]` 는 `citations[k-1]`(= `facts[].id`).
 */

export type MoveFactKind =
  | "news"
  | "disclosure"
  | "vi"
  | "market_action"
  | "halt"
  | "warning"
  | "flow"
  | "crypto_news"
  | "crypto_warning";

export type MoveCardReason = "large_move" | "vi" | "market_action" | "halt" | "warning";

/** `regression` 예측 배치 β · `market_adjusted` β 없이 시장 몫 = 지수(단순 계산) · `benchmark` 종목이 기준 자체(BTC) */
export type MoveSplitMethod = "regression" | "market_adjusted" | "benchmark";

export interface MoveSplit {
  /** 오늘 등락(%) */
  total: number;
  /** 시장 몫(%p) */
  market: number;
  /** 업종 몫(%p) — 없으면 두 단 */
  sector: number | null;
  /** 종목 몫(%p) */
  idio: number;
  method: MoveSplitMethod;
  /** 시장 기준 — 국내 `0001` · `1001`, 코인 `KRW-BTC` */
  marketIndex: string;
  sectorIndex: string | null;
  /** 업종 이름(원천 값 — `전기·전자`) */
  sectorName: string | null;
}

/**
 * 사실 한 줄 — `title` 은 제목(시황 · 공시 · 기사 원문) 또는 사건 코드(`vi:static:2` · `circuit_breaker:1:down` · `paused` · `caution` ·
 * `program` · `warning` · `caution:PRICE_FLUCTUATIONS`). 사건 코드 문구는 화면 i18n
 */
export interface MoveFact {
  id: string;
  kind: MoveFactKind;
  at: string;
  /** `KRX` · `UPBIT` · 제공처 이름 */
  source: string;
  title: string;
  /** 숫자 사실 — 프로그램 순매수(원) · VI 발동가(원) */
  value: number | null;
  /** 측정 태그(F017 단계 6) — 소식만 · 옛 BFF 면 없음 */
  tag?: NewsTag | null;
}

/** 원인 종류 · 단계(F017 v4 순서 1b · `BFF-REQ-052` FR-6 앞당김) — 단계는 서버가 받치는 근거 수로 정했다 */
export type MoveCauseKind = "disclosure" | "news" | "warning" | "listing" | "sector" | "market" | "flow" | "none";
export type MoveCauseStrength = "likely" | "possible" | "none";

/** 근거 한 줄 — 사실 + 숫자(`value`) · 비교 · 용어 풀이 · 출처 이름 · 시각. 문장은 서버 것 그대로 */
export interface MoveEvidence {
  kind: string;
  value: string;
  compare: string | null;
  gloss: string | null;
  source: string;
  at: string | null;
  /** 단계를 센 근거 — 화면은 굵게 */
  supports: boolean;
}

export interface MoveCause {
  kind: MoveCauseKind;
  strength: MoveCauseStrength;
  headline: string;
  note: string;
  /** 같은 날 사실 id — 소식 원인일 때만 */
  factId: string | null;
  at: string | null;
  evidence: MoveEvidence[];
}

export interface MoveCauseView {
  /** 강한 것이 앞 · 늘 하나 이상(받치는 근거가 없으면 "확인된 소식이 없어요") */
  causes: MoveCause[];
  result: { changeRate: number; text: string; past: string | null };
}

export interface WhyMoved {
  /** 원인 → 근거 → 결과 — 옛 BFF · 모양이 깨지면 없음(①② 만) */
  cause?: MoveCauseView | null;
  date: string;
  show: boolean;
  reasons: MoveCardReason[];
  /** 평소 하루 변동(%) */
  usualRate: number | null;
  split: MoveSplit | null;
  facts: MoveFact[];
  /** 원천을 못 읽은 사실 종류 — 그 줄만 "불러오지 못했어요" */
  unavailable: MoveFactKind[];
  /** ③ — 옛 BFF 면 없음(①② 만) */
  summary?: MoveSummary | null;
  gate?: MoveSummaryGate;
}

/**
 * ③ 게이트 — `ok` AI 문장(AI 생성 표시 필수) · `quiet` 서버 문장(고유 몫이 작거나 소식 없음 — AI 표시 없음) · `pending` 정리하는 중 ·
 * 그 밖(`no_citation` · `guard_blocked` · `no_split` · `no_card` · `disabled` · `unavailable`)은 ①② 만 — 안내 없음(`FEATURE-016` UX 표)
 */
export type MoveSummaryGate =
  | "ok"
  | "quiet"
  | "pending"
  | "no_citation"
  | "guard_blocked"
  | "no_split"
  | "no_card"
  | "disabled"
  | "unavailable";

export interface MoveSummary {
  text: string;
  citations: string[];
  label: "ai" | "server";
  generatedAt: string | null;
}

/** 국내는 KIS 키가 없으면 `disabled`, 코인은 `ok` | `unavailable` */
export type WhyMovedResult = ({ status: "ok" } & WhyMoved) | { status: "unavailable" } | { status: "disabled" };
