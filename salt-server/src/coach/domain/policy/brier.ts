/**
 * 내 "오를 확률" 채점 — FEATURE-009 FR-13 (`SRV-REQ-038` FR-10).
 *
 * 계획에 적은 `probabilityUp` 을 관찰 기간(계획의 `reviewAt`, 없으면 30일) 뒤 방향으로 Brier 채점한다.
 * 코치 전망(F008)과 같은 점수 · 같은 기준선(늘 50% 라고 말했을 때 0.25)이라 둘을 나란히 읽을 수 있다.
 *
 * ## 기준 가격은 적은 순간에 알 수 있던 것
 *
 * 계획을 적기 전 마지막으로 **닫힌** 일봉 종가가 출발점이다. 적은 날의 종가를 쓰면 그날 뒤에 움직인 몫이
 * 채점에 섞인다(`salt-forecast` `time-and-leakage.md` 와 같은 원칙). 결과는 만기 시각 뒤 첫 종가.
 * 같으면 "오르지 않음"이다.
 *
 * 채점은 저장하지 않는다 — 계획 · 일봉이 그대로면 결과도 같다. 월간 복기가 그달 몫을 저장한다.
 */

import Decimal from "decimal.js";

import { barCloseTime, type DailyBar } from "./adherence";
import { mirrorMetric, type MirrorMetric } from "./mirror";
import type { TradePlan } from "./tradePlan";

const DAY_MS = 24 * 60 * 60 * 1000;
export const BRIER_DEFAULT_HORIZON_DAYS = 30;
/** 늘 50% 라고 말했을 때의 Brier — 기준선 */
export const BRIER_BASELINE = new Decimal("0.25");
const HALF = new Decimal("0.5");

export type BrierPlan = Pick<TradePlan, "id" | "symbol" | "probabilityUp" | "plannedAt" | "reviewAt" | "sampleOrigin">;

export interface BrierCase {
  planId: string;
  symbol: string;
  probabilityUp: Decimal;
  plannedAt: Date;
  dueAt: Date;
  referenceClose: Decimal;
  outcomeClose: Decimal;
  up: boolean;
  score: Decimal;
  /** 50% 보다 한쪽으로 기울였는데 반대로 갔다 */
  missed: boolean;
}

export interface BrierSummary {
  /** 평균 Brier(0 이 완벽, 0.25 가 늘 50%) */
  meanScore: MirrorMetric;
  baseline: Decimal;
  /** 1 − 평균 ÷ 기준선. 양수면 기준선보다 낫다 */
  skill: Decimal | null;
  /** 빗나간 사례 수 */
  missedCount: number;
  /** 아직 만기 전 */
  pendingCount: number;
  /** 만기는 지났는데 종가가 없다(상장 전 · 결측) */
  unscorableCount: number;
  /** 가장 최근에 빗나간 것 최대 3건 */
  recentMisses: BrierCase[];
}

export const brierDueAt = (plan: Pick<BrierPlan, "plannedAt" | "reviewAt">): Date =>
  plan.reviewAt && plan.reviewAt > plan.plannedAt
    ? plan.reviewAt
    : new Date(plan.plannedAt.getTime() + BRIER_DEFAULT_HORIZON_DAYS * DAY_MS);

type Scored = { kind: "scored"; case: BrierCase } | { kind: "pending" } | { kind: "unscorable" } | { kind: "skip" };

export const scorePlanForecast = (plan: BrierPlan, bars: DailyBar[] | undefined, now: Date): Scored => {
  if (plan.probabilityUp === null || plan.sampleOrigin !== "live") return { kind: "skip" };
  const dueAt = brierDueAt(plan);
  if (dueAt > now) return { kind: "pending" };

  const reference = bars?.filter((bar) => barCloseTime(bar) <= plan.plannedAt).at(-1);
  const outcome = bars?.find((bar) => barCloseTime(bar) >= dueAt && barCloseTime(bar) <= now);
  if (!reference || !outcome) return { kind: "unscorable" };

  const up = outcome.close.gt(reference.close);
  const p = plan.probabilityUp;
  const score = p.minus(up ? 1 : 0).pow(2);
  return {
    kind: "scored",
    case: {
      planId: plan.id,
      symbol: plan.symbol,
      probabilityUp: p,
      plannedAt: plan.plannedAt,
      dueAt,
      referenceClose: reference.close,
      outcomeClose: outcome.close,
      up,
      score,
      missed: (p.gt(HALF) && !up) || (p.lt(HALF) && up),
    },
  };
};

/**
 * @param window 있으면 만기가 그 안에 든 계획만(월간 복기). 없으면 전부
 */
export const brierSummary = (
  plans: BrierPlan[],
  barsBySymbol: Map<string, DailyBar[]>,
  now: Date,
  window?: { from: Date; to: Date }
): BrierSummary => {
  const cases: BrierCase[] = [];
  let pendingCount = 0;
  let unscorableCount = 0;
  for (const plan of plans) {
    if (window) {
      const dueAt = brierDueAt(plan);
      if (dueAt < window.from || dueAt >= window.to) continue;
    }
    const result = scorePlanForecast(plan, barsBySymbol.get(plan.symbol.toUpperCase()), now);
    if (result.kind === "scored") cases.push(result.case);
    else if (result.kind === "pending") pendingCount += 1;
    else if (result.kind === "unscorable") unscorableCount += 1;
  }

  const mean = cases.length
    ? cases.reduce((sum, item) => sum.plus(item.score), new Decimal(0)).div(cases.length)
    : null;
  const misses = cases.filter((item) => item.missed);
  return {
    meanScore: mirrorMetric(mean, cases.length),
    baseline: BRIER_BASELINE,
    skill: mean === null ? null : new Decimal(1).minus(mean.div(BRIER_BASELINE)),
    missedCount: misses.length,
    pendingCount,
    unscorableCount,
    recentMisses: misses.sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime()).slice(0, 3),
  };
};
