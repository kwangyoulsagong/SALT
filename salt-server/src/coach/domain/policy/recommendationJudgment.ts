import type { CoachAction, CoachMode } from "../model";
import { COACH_HORIZON } from "./horizon";
import { claimBaseline, claimMisses, claimPeriod, type PerformanceClaim } from "./performanceClaim";
import {
  MIN_JUDGMENT_SAMPLE,
  ROUND_TRIP_COST,
  WAIT_BAND,
  type JudgmentOutcome,
  type JudgmentTrackStats,
} from "./symbolJudgment";

/**
 * 저장 추천의 **사후 판정** — F010 슬라이스 0 (성적표 신뢰성).
 *
 * ## 왜 따로 쌓는가
 *
 * 저장 추천(`investment_insights.ai_coach`)은 사용자당 한 행이 upsert 로 덮어써져 **이력이 없었고**, 성적표는
 * "판단 뒤 첫 종가 vs 최신 종가"라 **관찰 기간이 없었다** — 오래된 판단일수록 오래 든 수익률이 되고, 표본 1건이어도
 * 0% 나 100% 가 화면에 나갔다. 종목 판단(`symbolJudgment.ts`)과 같은 방식으로 고친다: 추천마다 불변 행 → 고정
 * 기간 뒤 채점 → 표본 20 미만이면 렌더하지 않는다.
 *
 * ## 지평은 30일 하나다
 *
 * 저장 추천은 포트폴리오 단위의 장기 조언이다(`GenerateCoachRecommendation` 의 후보는 보유 · 비중에서 나온다).
 * 붙어 있는 종목 판단의 `mode` 는 화면용이지 추천의 지평이 아니다. 그래서 스냅샷 모드는 늘 `long_term` 이고
 * 관찰 기간은 `COACH_HORIZON.long_term`(30일)이다. 단타 추천이 생기면 그때 열을 쓴다.
 *
 * ## 적중 (수수료 포함 — `symbolJudgment.ts` 와 같은 경계)
 *
 * | 행동 | 적중 |
 * |---|---|
 * | `buy` | 30일 수익률 > 왕복 비용 0.1% |
 * | `sell` | 30일 수익률 < −0.1% (팔라 했는데 비용 이상 내렸다) |
 * | `hold` · `rebalance` | 절댓값이 장기 관망 폭(10%) 안 |
 */

export const RECOMMENDATION_MODE: CoachMode = "long_term";
export const RECOMMENDATION_HORIZON_MS = COACH_HORIZON[RECOMMENDATION_MODE].ms;

export const recommendationMaturesAt = (judgedAt: Date): Date =>
  new Date(judgedAt.getTime() + RECOMMENDATION_HORIZON_MS);

/** 같은 사용자 · 종목 · 행동은 관찰 기간에 한 번만 쓴다(표본 독립성 — 워커가 10분마다 돈다). */
export const isRecommendationSnapshotDue = (lastJudgedAt: Date | null, now: Date): boolean =>
  lastJudgedAt === null || now.getTime() - lastJudgedAt.getTime() >= RECOMMENDATION_HORIZON_MS;

export const judgeRecommendationOutcome = (action: CoachAction, returnRate: number): JudgmentOutcome => {
  switch (action) {
    case "buy":
      return returnRate > ROUND_TRIP_COST ? "hit" : "miss";
    case "sell":
      return returnRate < -ROUND_TRIP_COST ? "hit" : "miss";
    case "hold":
    case "rebalance":
      return Math.abs(returnRate) <= WAIT_BAND[RECOMMENDATION_MODE] ? "hit" : "miss";
  }
};

/** `coach.<action>` 의 행동. 그 모양이 아니면 `null`. */
export const recommendationActionOf = (signalType: string): CoachAction | null => {
  const [head, action] = signalType.split(".");
  return head === "coach" &&
    (action === "buy" || action === "sell" || action === "hold" || action === "rebalance")
    ? action
    : null;
};

/** 기저율 — 사라는 추천은 "항상 오른다", 팔라는 추천은 "항상 안 오른다" 대비. 보유 · 리밸런싱은 없다. */
export const recommendationNaiveHitRate = (
  action: CoachAction | null,
  alwaysUpRate: number | null
): number | null => {
  if (action === null || alwaysUpRate === null) return null;
  switch (action) {
    case "buy":
      return alwaysUpRate;
    case "sell":
      return 1 - alwaysUpRate;
    case "hold":
    case "rebalance":
      return null;
  }
};

export interface RecommendationCase {
  symbol: string;
  action: CoachAction;
  judgedAt: Date;
  entryPrice: number;
  exitPrice: number;
  returnRate: number;
  outcome: JudgmentOutcome;
}

/** 저장 추천 성적표 한 줄 — 종목 판단 `trackRecord` 와 같은 지표 + 기저율. */
export interface RecommendationTrackRecord {
  signalType: string;
  sample: number;
  /** 표본 0 이면 `null` — 0% 가 아니다. */
  winRate: number | null;
  avgReturn: number | null;
  worstObservedReturn: number | null;
  lowSample: boolean;
  horizonHours: number;
  alwaysUpRate: number | null;
  /** 적중률 − 기저율. 0 근처면 추천이 아니라 시장 방향을 맞힌 것이다. 보유 · 리밸런싱 · 혼합 그룹은 `null`. */
  excessWinRate: number | null;
  /** 기간 · 표본 · 기준 · 빗나간 수 한 벌(F009 FR-33). 보유 · 리밸런싱 · 혼합은 기준이 없다(`no_direction`) */
  claim: PerformanceClaim;
}

export const summarizeRecommendationTrack = (
  signalType: string,
  stats: JudgmentTrackStats
): RecommendationTrackRecord => {
  const winRate = stats.sample > 0 ? stats.hits / stats.sample : null;
  const alwaysUpRate = stats.sample > 0 ? stats.aboveCost / stats.sample : null;
  const naive = recommendationNaiveHitRate(recommendationActionOf(signalType), alwaysUpRate);
  return {
    signalType,
    sample: stats.sample,
    winRate,
    avgReturn: stats.avgReturn,
    worstObservedReturn: stats.worstReturn,
    lowSample: stats.sample < MIN_JUDGMENT_SAMPLE,
    horizonHours: RECOMMENDATION_HORIZON_MS / 3600_000,
    alwaysUpRate,
    excessWinRate: winRate === null || naive === null ? null : winRate - naive,
    claim: {
      period: claimPeriod(stats.sample, stats.firstScoredAt, stats.lastScoredAt),
      sample: stats.sample,
      baseline: claimBaseline(stats.sample, naive === null ? null : "same_action_always", "no_direction"),
      misses: claimMisses(stats.sample, stats.sample - stats.hits, "no_direction"),
    },
  };
};
