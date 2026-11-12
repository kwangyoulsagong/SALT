import type { NewsTag } from "./newsTag";

/**
 * 오늘 왜 움직였나 — 화면 계약(F016 단계 C · `BFF-REQ-051` FR-1 · `FE-REQ-063` FR-1). BFF `services/why-moved.viewmodel.ts` 와 같은 모양.
 *
 * 값 · 보일지(`show`)는 전부 서버가 정한다(프론트 상수 0). 분해는 %p — 화면은 부호 · 자리만 그린다.
 * ③ 한 줄(`summary`)은 단계 D 가 칸과 같이 넣는다.
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

export interface WhyMoved {
  date: string;
  show: boolean;
  reasons: MoveCardReason[];
  /** 평소 하루 변동(%) */
  usualRate: number | null;
  split: MoveSplit | null;
  facts: MoveFact[];
  /** 원천을 못 읽은 사실 종류 — 그 줄만 "불러오지 못했어요" */
  unavailable: MoveFactKind[];
}

/** 국내는 KIS 키가 없으면 `disabled`, 코인은 `ok` | `unavailable` */
export type WhyMovedResult = ({ status: "ok" } & WhyMoved) | { status: "unavailable" } | { status: "disabled" };
