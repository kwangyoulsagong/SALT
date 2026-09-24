import type { CoachInsight } from "../model";

/**
 * 신호 성적표 — `signal-performance.service` 에서 옮겨온 **순수 집계**.
 *
 * ## 이것이 근거 3종의 "과거 적중률"이다
 *
 * 추천에는 **근거 · 과거 적중률 · 실패사례** 셋이 전부 붙어야 하고 하나라도 없으면
 * 렌더하지 않는다(전 영역 공통 수용 기준 1). `worstObservedReturn` 이 실패사례의 씨앗이고,
 * `winRate` 가 적중률이다. 표본이 없으면 `insufficient_data` 를 **숨기지 않고** 준다.
 */

export interface PerformanceSample {
  insightId: string;
  symbol: string;
  signalKey: string;
  createdAt: Date;
  entryPrice: number;
  latestPrice: number;
  returnRate: number;
  win: boolean;
}

export interface PerformanceSummary {
  status: "active" | "insufficient_data";
  sampleCount: number;
  winRate: number | null;
  avgReturn: number | null;
  /**
   * 표본 중 **가장 나빴던 단일 관찰 수익률**(`MIN(returnRate)`). 최대 낙폭(MDD)이 아니다 —
   * MDD 는 시간순 자산 곡선의 고점 대비 하락이라 관찰 종료 수익률만으로는 못 구한다(C04).
   */
  worstObservedReturn: number | null;
  samples: PerformanceSample[];
}

/** 응답에 싣는 표본 수 상한. 원문 그대로다. */
const SAMPLE_LIMIT = 20;

/**
 * 판단 1건에서 심볼과 신호 키를 뽑는다.
 *
 * 컬럼(`symbol`)이 비어 있으면 `payload` 에서 찾는다 — **이미 읽어 온 행의 필드를
 * 메모리에서 꺼내는 것**이고, `payload` 를 조건으로 뒤지는 쿼리가 아니다(FR-44).
 */
export const resolveSampleIdentity = (
  insight: CoachInsight,
  fallbackSymbol: string | undefined,
  signalKeyOverride: string | undefined
): { symbol: string; signalKey: string } | null => {
  const payload = insight.payload ?? {};
  const recommendation = payload.recommendation as
    | { symbol?: string; action?: string }
    | undefined;

  const symbol =
    insight.symbol ??
    (payload.symbol as string | undefined) ??
    recommendation?.symbol ??
    fallbackSymbol;

  if (!symbol) return null;

  return {
    symbol,
    signalKey:
      signalKeyOverride ??
      (payload.mode as string | undefined) ??
      recommendation?.action ??
      "ai_coach",
  };
};

/** 코치 피드백 행은 성적 표본이 아니다. */
export const isFeedbackInsight = (insight: CoachInsight): boolean =>
  (insight.payload?.kind ?? null) === "coach_feedback";

export const summarizePerformance = (
  samples: PerformanceSample[]
): PerformanceSummary => {
  const sampleCount = samples.length;
  const wins = samples.filter((sample) => sample.win).length;

  return {
    status: sampleCount ? "active" : "insufficient_data",
    sampleCount,
    winRate: sampleCount ? wins / sampleCount : null,
    avgReturn: sampleCount
      ? samples.reduce((sum, sample) => sum + sample.returnRate, 0) / sampleCount
      : null,
    worstObservedReturn: sampleCount
      ? Math.min(...samples.map((sample) => sample.returnRate))
      : null,
    samples: samples.slice(0, SAMPLE_LIMIT),
  };
};
