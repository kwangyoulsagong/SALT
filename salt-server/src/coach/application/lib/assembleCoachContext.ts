import {
  analyzePortfolioState,
  detectMarketRegime,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  type CoachContext,
  type CoachInsight,
  type CoachProfileStore,
  type CoachInsightStore,
  type MarketProbe,
  type NewsAnalysisResult,
  type PortfolioProbe,
  type SymbolFeature,
  type WhaleFlow,
} from "../../domain";

/**
 * 판단 재료 조립 — `ai-coach-feature.extractor` 에서 옮겨왔다.
 *
 * ## 유스케이스가 아니라 헬퍼다
 *
 * 혼자서는 아무것도 답하지 않는다. `GenerateCoachRecommendation` 한 곳만 부르고,
 * 분리한 이유는 **점수 엔진의 입력을 만드는 일과 추천을 저장하는 일이 다르기**
 * 때문이다 (`ddd-application.md` — `lib/` 는 유스케이스 내부 헬퍼).
 *
 * ## 조회가 전부 Port 를 지난다
 *
 * 원문은 여기서 `prisma.portfolioHolding` · `technicalIndicator` · `marketSentiment` ·
 * `marketAsset` · `whaleTransaction` · `investmentInsight` **여섯 테이블**을 직접
 * 뒤졌다. 그중 다섯은 남의 컨텍스트 것이다.
 */

/** 국면 판정 기준 종목. 원문 기본값이다. */
const REGIME_SYMBOL = "BTC";
/** 점수 계산에 쓰는 인사이트 상한. 원문의 `take: 100` 이다. */
const INSIGHT_LIMIT = 100;
/** 합산에 쓰는 대량 체결 상한. 전 심볼 합쳐서다. */
const WHALE_LIMIT = 100;
/** 심볼이 붙지 않은 리스크를 모으는 키. 모든 종목에 함께 붙는다. */
const GLOBAL_RISK_KEY = "__GLOBAL__";

export interface CoachContextDeps {
  profiles: CoachProfileStore;
  insights: CoachInsightStore;
  market: MarketProbe;
  portfolio: PortfolioProbe;
}

const toCurrentPrice = (value: number | null | undefined): number | undefined =>
  value === undefined ? undefined : Number(value ?? 0);

const groupRiskInsights = (
  riskInsights: CoachInsight[]
): Map<string, CoachInsight[]> => {
  const grouped = new Map<string, CoachInsight[]>();

  for (const risk of riskInsights) {
    // 리스크는 `payload.symbol` 에 종목을 담는 것과 컬럼에 담는 것이 섞여 있다.
    // 둘 다 없으면 전역으로 본다 — 원문과 같은 순서다.
    const symbol =
      (risk.payload?.symbol as string | undefined) ??
      risk.symbol ??
      GLOBAL_RISK_KEY;

    const bucket = grouped.get(symbol) ?? [];
    bucket.push(risk);
    grouped.set(symbol, bucket);
  }

  return grouped;
};

/**
 * 보유가 없거나 평가액이 0 이면 `null` 이다 — 점수를 매길 대상이 없다.
 * 그때 부르는 쪽이 종목 단위 판단으로 넘어간다.
 */
export const assembleCoachContext = async (
  deps: CoachContextDeps,
  userId: string,
  newsAnalysisMap: Map<string, NewsAnalysisResult>
): Promise<CoachContext | null> => {
  const [regimeIndicators, regimeSentiments, holdings, profile, insights] =
    await Promise.all([
      deps.market.latestIndicators([REGIME_SYMBOL]),
      deps.market.latestSentiments([REGIME_SYMBOL]),
      deps.portfolio.listHoldings(userId),
      deps.profiles.findByUser(userId),
      deps.insights.findActiveForScoring(userId, INSIGHT_LIMIT),
    ]);

  const portfolioState = analyzePortfolioState(holdings);
  if (!holdings.length || portfolioState.totalValue <= 0) return null;

  const marketRegime = detectMarketRegime(
    regimeIndicators.get(REGIME_SYMBOL),
    regimeSentiments.get(REGIME_SYMBOL)
  );

  const maxWeight =
    profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT;

  const buyZoneInsights = insights.filter((i) => i.type === "smart_buy_zone");
  const riskInsights = insights.filter((i) => i.type === "risk_alert");
  const behaviorInsights = insights.filter(
    (i) => i.type === "behavior_analysis"
  );

  const buyZoneSymbols = buyZoneInsights
    .map((i) => i.symbol)
    .filter((s): s is string => !!s);

  const symbols = Array.from(
    new Set([...holdings.map((h) => h.symbol), ...buyZoneSymbols])
  );

  const [indicatorMap, sentimentMap, quoteMap, whales] = await Promise.all([
    deps.market.latestIndicators(symbols),
    deps.market.latestSentiments(symbols),
    deps.market.quotes(symbols),
    deps.market.recentWhales(symbols, WHALE_LIMIT),
  ]);

  const holdingMap = new Map(holdings.map((h) => [h.symbol, h]));

  const whaleMap = new Map<string, WhaleFlow>();
  for (const tx of whales) {
    const flow = whaleMap.get(tx.symbol) ?? { buy: 0, sell: 0 };
    if (tx.transactionType === "buy") flow.buy += Number(tx.amountKRW ?? 0);
    else flow.sell += Number(tx.amountKRW ?? 0);
    whaleMap.set(tx.symbol, flow);
  }

  const buyZoneMap = new Map(
    buyZoneInsights
      .filter((i) => i.symbol)
      .map((i) => [i.symbol as string, i])
  );

  const riskMap = groupRiskInsights(riskInsights);

  const symbolFeatures = new Map<string, SymbolFeature>();
  for (const symbol of symbols) {
    symbolFeatures.set(symbol, {
      symbol,
      holding: holdingMap.get(symbol),
      indicator: indicatorMap.get(symbol),
      sentiment: sentimentMap.get(symbol),
      // 자산 행이 없으면 `undefined` 다 — 0 원이 아니라 "모른다"이고, 점수 엔진이
      // 그 둘을 다르게 읽지는 않지만 의미를 바꾸지 않는다 (원문과 같다).
      currentPrice: toCurrentPrice(quoteMap.get(symbol)?.currentPrice),
      whaleFlow: whaleMap.get(symbol),
      buyZoneInsight: buyZoneMap.get(symbol),
      riskInsights: [
        ...(riskMap.get(symbol) ?? []),
        ...(riskMap.get(GLOBAL_RISK_KEY) ?? []),
      ],
    });
  }

  return {
    userId,
    marketRegime,
    portfolioState,
    maxWeight,
    topHolding: holdings[0],
    holdings,
    symbolFeatures,
    behaviorInsights,
    candidateSymbols: symbols,
    newsAnalysisMap,
  };
};
