import type { CoachMode } from "@repo/core/coach";

/**
 * `POST /api/app/ai-coach/explain` 요청 — 서버 `explainCoachSchema` 그대로.
 *
 * **숫자는 우리가 싣고 모델은 문장만 만든다**(`ddd-infrastructure.md` §6). 값은 전부 서버가
 * 준 것(뷰모델 · 시세 목록)을 옮겨 적은 것이고 여기서 계산하지 않는다.
 */
export interface ExplainSymbolRequest {
  symbol: string;
  koreanName: string;
  mode: CoachMode;
  currentPrice: number;
  change24h: number;
  tradeValue24h: number;
  /** 1~20개. label ≤ 60자 · value ≤ 120자 */
  evidence: Array<{ label: string; value: string }>;
  /** ≤ 10개 */
  news?: Array<{ title: string; source?: string }>;
}

/**
 * 해설 응답 — BFF 가 가공하지 않고 넘기는 서버 `CoachExplanation`.
 *
 * `@repo/core/coach` 에 두지 않는 이유: BFF 가 이 모양을 소유하지 않는다(통과시킬 뿐이다).
 * 뷰모델처럼 "BFF 타입의 사본"이라고 적을 원본이 없다. 소비처가 이 기능 하나다.
 *
 * `timeframe` 은 **그리지 않는다**(`FE-REQ-026` FR-136) — 화면의 기간은 `validity.code` 하나다.
 * 예상 수익률 필드는 서버가 타입에서 지웠다(2026-09-18).
 */
export interface CoachExplanation {
  modeReasoning: string;
  timeframe: string;
  keyDrivers: string[];
  risks: string[];
  newsSummary: string[];
  disclaimer: string;
  generatedAt: string;
  cached: boolean;
}

/** 해설 대상 종목 — 시세 목록 한 줄에서 온다. 뷰모델에 이름 · 거래대금이 없다 */
export interface ExplainSubject {
  symbol: string;
  koreanName: string;
  currentPrice: number;
  change24h: number;
  tradeValue24h: number;
}
