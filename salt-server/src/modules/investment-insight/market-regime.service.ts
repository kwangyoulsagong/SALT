import { contextApis } from "../../composition";

export type MarketRegime =
  | "bullish"
  | "bearish"
  | "panic"
  | "euphoric"
  | "sideways";

/**
 * 시장 국면 판정.
 *
 * ## `prisma` 를 직접 뒤지지 않는다
 *
 * 원문은 `prisma.technicalIndicator` 와 `prisma.marketSentiment` 를 직접 조회했다.
 * "최신 지표"의 정의(정렬 컬럼이 `timestamp` 냐 `calculatedAt` 이냐)가 이 파일과
 * `ai-coach-feature.extractor` · `investment-insight.service` 에 각자 있었다.
 *
 * 이제 `market` 의 공개 API 를 부른다 (`SRV-REQ-006` FR-32a). **이 파일은 아직
 * `modules/` 에 있다** — `coach` 컨텍스트 이관은 FR-32 이고, 그때 이 판정이
 * `coach/domain/policy` 로 간다. 그 전에 경계부터 세운 것이다.
 */
export class MarketRegimeService {
  async detectRegime(symbol: string = "BTC"): Promise<MarketRegime> {
    const [indicator, sentiment] = await Promise.all([
      contextApis.market.latestIndicator(symbol),
      contextApis.market.latestSentiment(symbol),
    ]);

    if (!indicator && !sentiment) return "sideways";

    const rsi = indicator?.rsi14 ?? 50;
    const fearGreed = sentiment?.fearGreedIndex ?? 50;

    if (fearGreed < 25 && rsi < 30) return "panic";
    if (fearGreed > 75 && rsi > 70) return "euphoric";
    if (rsi >= 60) return "bullish";
    if (rsi <= 40) return "bearish";

    return "sideways";
  }
}
