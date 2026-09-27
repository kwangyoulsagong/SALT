import { MIN_JUDGMENT_SAMPLE, type JudgmentTrackStats } from "./symbolJudgment";
import {
  summarizeRecommendationTrack,
  type RecommendationCase,
  type RecommendationTrackRecord,
} from "./recommendationJudgment";

/**
 * 신호 성적표(`GET /api/signal-performance`) — F010 슬라이스 0 에서 **원장 기반**으로 바뀌었다.
 *
 * ## 이것이 근거 3종의 "과거 적중률"이다
 *
 * 전에는 저장 추천 행(사용자당 1행 · 덮어쓰기)에서 "판단 뒤 첫 종가 vs 최신 종가"를 세서 표본 1건이어도 `active` 였다.
 * 지금은 추천 스냅샷(`coach_recommendation_snapshots`)의 **30일 뒤 채점 결과**만 세고, 표본이 20 미만이면
 * `insufficient_data` 다 — 종목 판단 게이트(`MIN_JUDGMENT_SAMPLE`)와 같은 기준이다. **없는 적중률을 채워 넣지 않는다.**
 */

export interface PerformanceSample {
  symbol: string;
  action: RecommendationCase["action"];
  judgedAt: Date;
  entryPrice: number;
  exitPrice: number;
  returnRate: number;
  outcome: RecommendationCase["outcome"];
}

export interface PerformanceSummary extends Omit<RecommendationTrackRecord, "signalType"> {
  status: "active" | "insufficient_data";
  /** 그룹 키. 전체(행동 무관)면 `coach` */
  signalType: string;
  sampleCount: number;
  samples: PerformanceSample[];
}

/** 응답에 싣는 표본 수 상한. 원문 그대로다. */
export const PERFORMANCE_SAMPLE_LIMIT = 20;

export const summarizePerformance = (
  signalType: string,
  stats: JudgmentTrackStats,
  cases: RecommendationCase[]
): PerformanceSummary => {
  const track = summarizeRecommendationTrack(signalType, stats);
  return {
    ...track,
    status: stats.sample >= MIN_JUDGMENT_SAMPLE ? "active" : "insufficient_data",
    sampleCount: stats.sample,
    samples: cases.slice(0, PERFORMANCE_SAMPLE_LIMIT),
  };
};
