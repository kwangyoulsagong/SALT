import {
  judgeRecommendationOutcome,
  judgmentReturnRate,
  recommendationMaturesAt,
  RECOMMENDATION_HORIZON_MS,
  type Clock,
  type JudgmentEvaluation,
  type MarketProbe,
  type RecommendationSnapshotStore,
} from "../domain";

/** 한 회차에 판정하는 스냅샷 수 상한 — 종목 판단과 같다. 밀린 것은 다음 회차가 이어 간다. */
const EVALUATION_BATCH = 200;

export interface RecommendationEvaluationResult {
  evaluated: number;
  /** 관찰 기간은 지났는데 그 뒤 일봉 종가가 아직 없는 것. 다음 회차에 다시 본다. */
  waitingForPrice: number;
}

/**
 * 30일이 지난 저장 추천 스냅샷에 결과를 매긴다 (F010 슬라이스 0).
 *
 * 판정 가격은 **관찰 기간이 끝난 시각 이후 첫 일봉 종가**다(`JUDGMENT_PRICE_TIMEFRAME.long_term`).
 * 없으면 건너뛰고 다음 회차에 본다 — 추정값으로 채우지 않는다. 스냅샷을 **쓰는 쪽**은
 * `GenerateCoachRecommendation` 이다(추천이 나오는 그 자리).
 */
export class EvaluateCoachRecommendations {
  constructor(
    private readonly market: MarketProbe,
    private readonly recommendations: RecommendationSnapshotStore,
    private readonly now: Clock = () => new Date()
  ) {}

  async execute(): Promise<RecommendationEvaluationResult> {
    const now = this.now();
    const matured = await this.recommendations.listPending(
      new Date(now.getTime() - RECOMMENDATION_HORIZON_MS),
      EVALUATION_BATCH
    );

    const exits = await Promise.all(
      matured.map((item) =>
        this.market.closeAtOrAfter(item.symbol, recommendationMaturesAt(item.judgedAt), "d1")
      )
    );

    const evaluations: JudgmentEvaluation[] = [];
    matured.forEach((item, index) => {
      const exitPrice = exits[index];
      if (!exitPrice || item.entryPrice <= 0) return;
      const returnRate = judgmentReturnRate(item.entryPrice, exitPrice);
      evaluations.push({
        id: item.id,
        exitPrice,
        returnRate,
        outcome: judgeRecommendationOutcome(item.action, returnRate),
        evaluatedAt: now,
      });
    });

    await this.recommendations.saveEvaluations(evaluations);
    return { evaluated: evaluations.length, waitingForPrice: matured.length - evaluations.length };
  }
}
