import type { CoachMode, MarketRegime } from "../model";
import type { ModeDecision, ModeDecisionComponent } from "./modeDecision";
import { MODE_DECISION_RULE_VERSION } from "./modeDecision";

/**
 * 예측 원장 — F010 슬라이스 1 (`SRV-REQ-024` FR-178 · `DB-REQ-017` FR-62).
 *
 * ## 스냅샷과 무엇이 다른가
 *
 * `SymbolJudgmentSnapshot` 은 관찰 기간(단타 24시간 · 장기 30일)당 **1건**이다 — 성적표 표본이라 겹치면 안 된다.
 * 원장은 **매일 전부**다. 규칙 항목별 IC(사전등록 `rule-ic@1`)는 날짜마다 종목 간 순위를 보므로 매일의 단면이 필요하다.
 * 겹침은 읽는 쪽(블록 부트스트랩)이 다룬다.
 *
 * ## 두 개의 시각
 *
 * 행의 `decidedAt` 은 판단을 **낸** 시각(도착)이고, 재료마다 `observedAt` 은 그 값이 **생긴** 시각(발생)이다.
 * 1분 전 시세와 6시간 전 심리로 낸 판단을 나중에 가를 수 있어야 한다(`time-and-leakage.md` §1 과 같은 원칙).
 *
 * ## 판정 열이 없다
 *
 * 적중 여부를 행에 적지 않는다 — 라벨(수익률 · 삼중 장벽)은 읽는 쪽이 가격으로 만든다. 경계를 바꿀 때 행을
 * 다시 쓰지 않아도 된다(슬라이스 0 회고 Action). 그래서 이 표는 **불변**이다(UPDATE 트리거).
 */

export const LEDGER_RULE_VERSION = MODE_DECISION_RULE_VERSION;

/** 시장 국면 태그의 기준 종목 — 시장 전체 국면은 BTC 로 본다. */
export const LEDGER_REGIME_SYMBOL = "BTC";

/** UTC 자정. 원장의 날 키다 — 같은 날 두 번째 발행은 건너뛴다. */
export const ledgerDate = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

export const ledgerKey = (symbol: string, mode: CoachMode) => `${symbol}:${mode}`;

/** 재료 한 벌 — 값과 발생 시각. 없는 재료는 `null`(빈 객체가 아니다). */
export interface LedgerMaterials {
  quote: { price: number; change24h: number | null; observedAt: string | null } | null;
  sentiment: { score: number; fearGreed: number | null; observedAt: string } | null;
  indicator: { timeframe: string; rsi14: number | null; observedAt: string } | null;
  whales: {
    buyKRW: number;
    sellKRW: number;
    count: number;
    /** 표본 체결 중 가장 이른 · 늦은 발생 시각. 2026-09-29 전 행은 발생 시각이 없어 도착 시각이다 */
    oldestAt: string;
    newestAt: string;
  } | null;
  /**
   * 시장 국면(F010 슬라이스 2 · `forecast.v_market_regime`) — BTC 200일선 · HMM 고변동 확률 · 365일 낙폭.
   * 점수에 쓰지 않는다. 다음 사전등록이 라이브 표본을 국면으로 나눌 재료다. 2026-09-29 전 행 · 국면 작업이 없으면 `null`
   */
  market?: {
    trendOpen: boolean;
    highVolProbability: number | null;
    drawdown365d: number | null;
    observedAt: string;
  } | null;
  /** 종목 실현 변동성(연율) · 90일 BTC 베타(F010 슬라이스 2). 점수에 쓰지 않는다 */
  risk?: { annualizedVolatility: number | null; btcBeta: number | null; observedAt: string } | null;
}

export interface JudgmentLedgerDraft {
  symbol: string;
  mode: CoachMode;
  asOfDate: Date;
  decidedAt: Date;
  ruleVersion: string;
  score: number;
  action: ModeDecision["action"];
  components: ModeDecisionComponent[];
  materials: LedgerMaterials;
  missingData: string[];
  regime: MarketRegime;
  entryPrice: number;
  entryObservedAt: Date | null;
}

export const ledgerDraft = (input: {
  decision: ModeDecision;
  components: ModeDecisionComponent[];
  materials: LedgerMaterials;
  missingData: string[];
  regime: MarketRegime;
  entryPrice: number;
  entryObservedAt: Date | null;
  now: Date;
}): JudgmentLedgerDraft => ({
  symbol: input.decision.symbol,
  mode: input.decision.mode,
  asOfDate: ledgerDate(input.now),
  decidedAt: input.now,
  ruleVersion: LEDGER_RULE_VERSION,
  score: input.decision.score,
  action: input.decision.action,
  components: input.components,
  materials: input.materials,
  missingData: input.missingData,
  regime: input.regime,
  entryPrice: input.entryPrice,
  entryObservedAt: input.entryObservedAt,
});
