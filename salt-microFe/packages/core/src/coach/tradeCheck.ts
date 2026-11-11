/**
 * 사기 전 · 팔기 전 점검 — BFF `GET /api/app/ai-coach/check` 뷰모델(F017 v2 단계 2 · `BFF-REQ-052` FR-3 · `FE-REQ-064` FR-3).
 * 정의 원본은 `bff/src/services/trade-check.viewmodel.ts` — 모양을 바꾸면 둘을 같이 바꾼다.
 *
 * `summary` 는 서버가 실제 숫자로 만든 문장이다 — 화면은 고치지 않고 그대로 한 줄로 그린다.
 * 비율은 0~1, 분위는 로그수익(퍼센트 표기는 화면).
 */

export type TradeCheckStatus = "ok" | "below_min" | "no_condition";
export type TradeCheckSide = "buy" | "sell";
export type TradeCheckConditionReason = "none_matched" | "stale_reference" | "not_covered";

export interface TradeCheckRange {
  q10: number;
  q50: number;
  q90: number;
  /** 서버가 만든 범위 문장(나쁜 10% · 가운데 · 좋은 10%) */
  text: string;
}

export interface TradeCheckHorizon {
  horizon: number;
  label: string;
  status: "ok" | "below_min";
  sample: number;
  sampleDays: number;
  upRate: number | null;
  mean: number | null;
  range: TradeCheckRange | null;
  hold: { upRate: number | null; range: TradeCheckRange | null };
}

export interface TradeCheckResult {
  symbol: string;
  market: "kr" | "crypto";
  side: TradeCheckSide;
  status: TradeCheckStatus;
  summary: string;
  conditionReason: TradeCheckConditionReason | null;
  condition: { id: string; phrase: string; describeOnly: boolean } | null;
  alsoMatched: { id: string; phrase: string }[];
  horizonLabel: string;
  /** 100칸 점 중 칠할 칸 수 — 분모 100 고정. 비율이 없으면 null(점을 그리지 않는다) */
  dots: number | null;
  upRate: number | null;
  upRange: { low: number; high: number } | null;
  sample: number | null;
  sampleDays: number | null;
  sampleEffective: number | null;
  differsFromUsual: "higher" | "lower" | null;
  recentDiffers: boolean | null;
  usual: { upRate: number | null; holdUpRate: number | null; sample: number } | null;
  horizons: TradeCheckHorizon[];
  /** 팔기 전 + 보유 — 지금 팔면 확정되는 수익률(%). 펼침 칸에만 */
  holding: { realizedPct: number } | null;
  reference: { close: number | null; at: string | null; computedAt: string | null };
  disclaimer: string;
}
