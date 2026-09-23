import {
  isFeedbackInsight,
  resolveSampleIdentity,
  summarizePerformance,
  type CoachInsightStore,
  type MarketProbe,
  type PerformanceSummary,
} from "../domain";
import { collectPerformanceSamples } from "./lib/performanceSamples";

/** 성적 표본을 뽑는 판단 수 상한. 원문의 `take: 100` 이다. */
const HISTORY_LIMIT = 100;

export interface SignalPerformanceQuery {
  symbol?: string;
  signalKey?: string;
}

export interface SignalPerformanceView extends PerformanceSummary {
  generatedAt: string;
}

/**
 * 신호 성적표 — `signal-performance.service` 에서 옮겨왔다.
 *
 * ## 이것이 근거 3종의 "과거 적중률"이다
 *
 * 표본이 없으면 `insufficient_data` 를 그대로 준다. 추천 화면은 3종 세트 중 하나라도
 * 없으면 렌더하지 않는다(공통 수용 기준 1) — **없는 적중률을 채워 넣지 않는 것**이
 * 이 유스케이스의 일이다.
 *
 * ## 쿼리 수를 절반으로 줄였다
 *
 * 원문은 판단 1건마다 **진입가와 최신가를 각각** 조회했다(판단 100건이면 200회).
 * 최신가는 심볼 단위라 한 번에 받을 수 있어 그렇게 바꿨다. 진입가는 판단 시각마다
 * 달라 아직 건별이다 — 성적을 스냅샷 테이블로 옮기는 것이 F004 의 일이고,
 * 그때 이 루프가 사라진다.
 */
export class GetSignalPerformance {
  constructor(
    private readonly insights: CoachInsightStore,
    private readonly market: MarketProbe
  ) {}

  async execute(
    userId: string,
    query: SignalPerformanceQuery = {}
  ): Promise<SignalPerformanceView> {
    const fallbackSymbol = query.symbol?.toUpperCase();

    const history = await this.insights.findRecommendationHistory(
      userId,
      fallbackSymbol,
      HISTORY_LIMIT
    );

    const scored = history
      .filter((insight) => !isFeedbackInsight(insight))
      .map((insight) => ({
        insight,
        identity: resolveSampleIdentity(insight, fallbackSymbol, query.signalKey),
      }))
      .filter(
        (row): row is { insight: (typeof history)[number]; identity: NonNullable<ReturnType<typeof resolveSampleIdentity>> } =>
          row.identity !== null
      );

    const samples = await collectPerformanceSamples(this.market, scored);

    return {
      ...summarizePerformance(samples),
      generatedAt: new Date().toISOString(),
    };
  }
}
