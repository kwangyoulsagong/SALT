import type { CoachMode } from "../model";
import {
  MODE_DECISION_THRESHOLDS,
  SCORED_ITEMS,
  type ModeDecisionComponent,
} from "./modeDecision";

/**
 * 판단의 **관측 근거**와 **꼬리표 사실** — `ADR-010`(채택 2026-11-10) · `SRV-REQ-053` FR-1 · 2.
 *
 * 근거 = 엔진이 이 판단에 실제로 본 값이다. 문턱을 넘은 문장만이 아니다 — 관망은 값을 보고 "문턱 안"이라 판정한
 * **결과**라서, 본 값(관측)이 곧 근거다. 관측은 원장(`judgment_ledger.components`)에 남는 같은 기여에서 만든다 —
 * 새 계산이 아니다.
 *
 * 부족한 것은 판단을 숨기지 않고 꼬리표로 사실을 말한다("RSI 를 사흘째 못 받았어요", 2026-11-10 개정).
 */

/** 관측하는 항목 — 지금 규칙이 점수에 쓰는 **시장 재료**만(빠진 재료 수 `missing_data` 는 재료가 아니라 메타라 뺀다) */
export type ObservedItem = keyof typeof MODE_DECISION_THRESHOLDS;

export interface JudgmentObservation {
  item: ObservedItem;
  /** 엔진이 본 값(원장 기여의 `value`). 없으면 `null` */
  value: number | null;
  lower: number;
  upper: number;
  /** 가까운 문턱까지 거리(같은 단위 · 절댓값 · 소수 둘째 자리). 문턱을 넘었으면 넘은 폭. 결측이면 `null` */
  distance: number | null;
  /** 이 항목의 점수 기여(원장 기여의 `points`) — 0 이면 문턱 안 */
  points: number;
  /** 재료가 없어 보지 못했다 — 근거로 세지 않는다 */
  missing: boolean;
}

const OBSERVED: readonly ObservedItem[] = ["change24h", "sentiment", "rsi"];

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * 모드 하나의 관측. **문턱에 가까운 순**(거리 ÷ 문턱 폭)으로 정렬해 준다 — 화면은 앞의 둘을 그린다(무엇을 보여 줄지를
 * 서버가 정한다). 결측은 맨 뒤.
 *
 * `missingInputs` — 판단의 빠진 재료(`missingByMode`). 24시간 변화는 시세가 없으면 0 으로 계산되므로(`judgeSymbol`)
 * 값이 있어도 `price` 가 빠졌으면 결측이다 — 0 을 관측으로 세면 지어낸 근거다.
 */
export const judgmentObservations = (
  mode: CoachMode,
  components: readonly ModeDecisionComponent[],
  missingInputs: readonly string[]
): JudgmentObservation[] => {
  const scored = SCORED_ITEMS[mode];
  const rows = OBSERVED.filter((item) => scored.includes(item)).flatMap((item) => {
    const component = components.find((c) => c.item === item);
    if (!component) return [];
    const { lower, upper } = MODE_DECISION_THRESHOLDS[item];
    const missing = component.value === null || (item === "change24h" && missingInputs.includes("price"));
    const value = missing ? null : component.value;
    const distance =
      value === null ? null : round2(Math.min(Math.abs(value - lower), Math.abs(value - upper)));
    return [{ item, value, lower, upper, distance, points: component.points, missing }];
  });
  const nearness = (row: JudgmentObservation) =>
    row.distance === null ? Number.POSITIVE_INFINITY : row.distance / (row.upper - row.lower);
  return rows.sort((a, b) => nearness(a) - nearness(b));
};

/** 근거로 세는 관측 — 결측이 아닌 것 */
export const observedEvidence = (observations: readonly JudgmentObservation[]): JudgmentObservation[] =>
  observations.filter((row) => !row.missing);

export type StaleInputItem = "price" | "technical_indicator";

/**
 * 꼬리표 하나 = 사유 + 그 사실. 지어낼 수 없는 값은 싣지 않는다: 투자유의는 **지정 시각을 모른다**
 * (표시 수집이 지정 여부만 준다) — 확인한 시각만. 사유 목록 · 순서는 `JudgmentCaveatReason`(`symbolJudgment.ts`).
 */
export type JudgmentCaveat =
  | { reason: "insufficient_history"; have: number; need: number; dailyIndicator: boolean }
  | { reason: "exchange_warning"; cautions: string[]; checkedAt: string | null }
  | { reason: "stale_inputs"; items: Array<{ item: StaleInputItem; lastAt: string | null }> }
  /** 라이브 표본 `live` 가 `min` 에 못 미쳐(또는 빗나간 사례 0) 과거 검산 `backtest` 건으로 채웠다 */
  | { reason: "live_sample_short"; live: number; min: number; backtest: number }
  | { reason: "inputs_missing"; items: string[] }
  | { reason: "track_record_unavailable" }
  /** 라이브 `live` 건 · 쓸 수 있는 과거 검산 없음 — 결함 */
  | { reason: "backtest_missing"; live: number; min: number };

export interface CaveatFactsContext {
  /** 국내 주식 이력(F011 FR-62). 코인은 없다 */
  history?: { dailyBars: number; requiredDailyBars: number; dailyIndicator: boolean };
  staleInputs: readonly StaleInputItem[];
  /** 재료의 마지막 시각 — 시세 갱신 · 그 모드 지표 봉. 모르면 `null` */
  inputTimes: Record<StaleInputItem, Date | null>;
  exchange?: { cautions: readonly string[]; checkedAt: Date | null };
  observations: readonly JudgmentObservation[];
  /** 라이브 표본 수 · 과거 검산 표본 수(없으면 0) · 문턱 */
  liveSample: number;
  backtestSample: number;
  minSample: number;
}

/**
 * 꼬리표 사유 → 그 사실. 사유가 늘면 여기가 컴파일 에러로 알린다(`switch` 가 전부를 덮는다).
 * 시각은 응답 직전 ISO 문자열 한 번.
 */
export const judgmentCaveatFacts = (reason: JudgmentCaveat["reason"], ctx: CaveatFactsContext): JudgmentCaveat => {
  switch (reason) {
    case "insufficient_history":
      return {
        reason,
        have: ctx.history?.dailyBars ?? 0,
        need: ctx.history?.requiredDailyBars ?? 0,
        dailyIndicator: ctx.history?.dailyIndicator ?? false,
      };
    case "exchange_warning":
      return {
        reason,
        cautions: [...(ctx.exchange?.cautions ?? [])],
        checkedAt: ctx.exchange?.checkedAt?.toISOString() ?? null,
      };
    case "stale_inputs":
      return {
        reason,
        items: ctx.staleInputs.map((item) => ({ item, lastAt: ctx.inputTimes[item]?.toISOString() ?? null })),
      };
    case "live_sample_short":
      return { reason, live: ctx.liveSample, min: ctx.minSample, backtest: ctx.backtestSample };
    case "inputs_missing":
      return { reason, items: ctx.observations.filter((row) => row.missing).map((row) => row.item) };
    case "track_record_unavailable":
      return { reason };
    case "backtest_missing":
      return { reason, live: ctx.liveSample, min: ctx.minSample };
  }
};
