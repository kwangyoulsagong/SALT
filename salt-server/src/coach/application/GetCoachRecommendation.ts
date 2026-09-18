import type { CoachInsight, CoachInsightStore, CoachMode } from "../domain";
import { GetSymbolCoach, type SymbolCoachView } from "./GetSymbolCoach";

export interface CoachRecommendationQuery {
  symbol?: string;
  mode?: CoachMode;
  preview?: boolean;
}

/**
 * 저장된 코치 판단 조회 — `ai-investment-coach.service.getCoach` 에서 옮겨왔다.
 *
 * ## 한 엔드포인트가 두 가지를 답한다
 *
 * 쿼리에 `symbol`·`mode`·`preview` 중 하나라도 있으면 **종목 단위 판단**을 즉석에서
 * 계산하고, 아무것도 없으면 **저장된 마지막 추천**을 준다. 원문 그대로다 —
 * BFF 의 미리보기·상세가 둘 다 이 경로를 쓰므로(`app-ai-coach.service`) 나누려면
 * 프론트 계약을 먼저 바꿔야 한다.
 */
export class GetCoachRecommendation {
  constructor(
    private readonly insights: CoachInsightStore,
    private readonly symbolCoach: GetSymbolCoach
  ) {}

  execute(
    userId: string,
    query: CoachRecommendationQuery = {}
  ): Promise<CoachInsight | SymbolCoachView | null> {
    if (query.symbol || query.mode || query.preview) {
      return this.symbolCoach.execute(userId, {
        symbol: query.symbol?.toUpperCase() ?? "BTC",
        mode: query.mode,
        preview: query.preview,
      });
    }

    return this.insights.findLatestRecommendation(userId);
  }
}
