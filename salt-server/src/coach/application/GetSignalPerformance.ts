import {
  summarizePerformance,
  PERFORMANCE_SAMPLE_LIMIT,
  type PerformanceSummary,
  type RecommendationFilter,
  type RecommendationSnapshotStore,
} from "../domain";

export interface SignalPerformanceQuery {
  symbol?: string;
  /** `coach.<action>` 또는 `<action>`. 없으면 이 사용자의 추천 전체다. */
  signalKey?: string;
}

export interface SignalPerformanceView extends PerformanceSummary {
  generatedAt: string;
}

/** 옛 호출은 `mode` · `action` 을 그대로 보냈다 — `coach.` 접두가 없으면 붙인다. */
const toSignalType = (signalKey: string | undefined): string | undefined =>
  signalKey === undefined ? undefined : signalKey.startsWith("coach.") ? signalKey : `coach.${signalKey}`;

/**
 * 신호 성적표 — F010 슬라이스 0 에서 **추천 스냅샷 원장** 기반으로 바뀌었다.
 *
 * 전에는 저장 추천 100건을 읽어 "판단 뒤 첫 종가 vs 최신 종가"를 셌다. 이제 표본은 30일 뒤 채점된 스냅샷이고,
 * 집계는 저장소가 한다(`summarize`). 표본 20 미만이면 `insufficient_data` — **없는 적중률을 채워 넣지 않는다.**
 */
export class GetSignalPerformance {
  constructor(private readonly recommendations: RecommendationSnapshotStore) {}

  async execute(userId: string, query: SignalPerformanceQuery = {}): Promise<SignalPerformanceView> {
    const filter: RecommendationFilter = {
      symbol: query.symbol?.toUpperCase(),
      signalType: toSignalType(query.signalKey),
    };
    const [stats, cases] = await Promise.all([
      this.recommendations.summarize(userId, filter),
      this.recommendations.recentCases(userId, filter, null, PERFORMANCE_SAMPLE_LIMIT),
    ]);
    return {
      ...summarizePerformance(filter.signalType ?? "coach", stats, cases),
      generatedAt: new Date().toISOString(),
    };
  }
}
