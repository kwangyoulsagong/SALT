import {
  makeModeDecision,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  type CoachMode,
  type CoachProfileStore,
  type MarketProbe,
  type ModeDecision,
  type PortfolioProbe,
} from "../domain";

/** 대량 체결 표본 수. 원문의 `take: 20` 이다. */
const WHALE_SAMPLE = 20;

export interface SymbolCoachQuery {
  symbol: string;
  mode?: CoachMode;
  preview?: boolean;
}

export interface SymbolCoachView {
  symbol: string;
  mode: CoachMode;
  preview: boolean;
  headline: string;
  modeDecision: ModeDecision;
  dualDecision: { scalp: ModeDecision; longTerm: ModeDecision };
  riskGuard: {
    hasHolding: boolean;
    holdingWeightLimit: number;
    currentValue: number;
    unrealizedProfitRate: number | null;
  };
  evidence: {
    price: number | null;
    change24h: number | null;
    sentiment: { score: number; label: string; calculatedAt: Date } | null;
    technical: { rsi: number | null; timestamp: Date } | null;
    whale: { buyAmountKRW: number; sellAmountKRW: number; count: number };
  };
  /** 빠진 재료. **숨기지 않고 내려보낸다** — 판단의 전제를 드러내는 값이다. */
  missingData: string[];
  dataFreshness: {
    priceUpdatedAt: Date | null;
    sentimentCalculatedAt: Date | null;
    indicatorTimestamp: Date | null;
    generatedAt: string;
  };
}

/**
 * 종목 하나에 대한 두 모드 판단.
 *
 * 보유가 없어도 답한다 — 관심 종목을 훑어보는 화면이 이것을 쓴다. 그래서
 * `GenerateCoachRecommendation` 이 보유 없음으로 `null` 을 받을 때의 대체 경로이기도 하다.
 *
 * ## 지표 주기가 `m5` 로 고정됐다
 *
 * 원문은 `technicalIndicator` 를 주기 제한 없이 최신순으로 하나 읽었다. 그러면 같은
 * 심볼이 호출마다 `m5` 와 `h1` 중 아무거나 주고, RSI 과열 판정이 흔들린다.
 * `MarketProbe` 가 `m5` 로 고정한다 — 원문의 다른 경로(`ai-coach-feature.extractor`)가
 * 이미 `m5` 였으므로 **둘 중 하나를 고른 것**이고, 그 사실을 여기 적어 둔다.
 */
export class GetSymbolCoach {
  constructor(
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly profiles: CoachProfileStore
  ) {}

  async execute(
    userId: string,
    query: SymbolCoachQuery
  ): Promise<SymbolCoachView> {
    const symbol = query.symbol.toUpperCase();

    const [quotes, holding, sentiments, indicators, whales, profile] =
      await Promise.all([
        this.market.quotes([symbol]),
        this.portfolio.getHolding(userId, symbol),
        this.market.latestSentiments([symbol]),
        this.market.latestIndicators([symbol]),
        this.market.recentWhales([symbol], WHALE_SAMPLE),
        this.profiles.findByUser(userId),
      ]);

    const quote = quotes.get(symbol);
    const sentiment = sentiments.get(symbol);
    const indicator = indicators.get(symbol);

    const missingData: string[] = [];
    if (!quote?.currentPrice) missingData.push("price");
    if (!sentiment) missingData.push("sentiment");
    if (!indicator) missingData.push("technical_indicator");
    if (!whales.length) missingData.push("whale_flow");

    const whaleBuy = whales
      .filter((item) => item.transactionType === "buy")
      .reduce((sum, item) => sum + Number(item.amountKRW ?? 0), 0);
    const whaleSell = whales
      .filter((item) => item.transactionType === "sell")
      .reduce((sum, item) => sum + Number(item.amountKRW ?? 0), 0);

    const shared = {
      symbol,
      change24h: Number(quote?.change24h ?? sentiment?.priceChange24h ?? 0),
      sentimentScore: sentiment?.sentimentScore,
      rsi: indicator?.rsi14 ? Number(indicator.rsi14) : undefined,
      whaleBuy,
      whaleSell,
      hasHolding: Boolean(holding),
      missingData,
    };

    const scalp = makeModeDecision({ ...shared, mode: "scalp" });
    const longTerm = makeModeDecision({ ...shared, mode: "long_term" });

    const selectedMode: CoachMode = query.mode ?? "scalp";
    const modeDecision = selectedMode === "scalp" ? scalp : longTerm;

    return {
      symbol,
      mode: selectedMode,
      preview: Boolean(query.preview),
      headline: modeDecision.headline,
      modeDecision,
      dualDecision: { scalp, longTerm },
      riskGuard: {
        hasHolding: Boolean(holding),
        holdingWeightLimit:
          profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
        currentValue: holding?.currentValue ?? 0,
        unrealizedProfitRate: holding?.unrealizedProfitRate ?? null,
      },
      evidence: {
        price: quote?.currentPrice ?? null,
        change24h: quote?.change24h ?? null,
        sentiment: sentiment
          ? {
              score: sentiment.sentimentScore,
              label: sentiment.sentimentLabel,
              calculatedAt: sentiment.calculatedAt,
            }
          : null,
        technical: indicator
          ? {
              rsi: indicator.rsi14 === null ? null : Number(indicator.rsi14),
              timestamp: indicator.timestamp,
            }
          : null,
        whale: {
          buyAmountKRW: whaleBuy,
          sellAmountKRW: whaleSell,
          count: whales.length,
        },
      },
      missingData,
      dataFreshness: {
        priceUpdatedAt: quote?.priceUpdatedAt ?? null,
        sentimentCalculatedAt: sentiment?.calculatedAt ?? null,
        indicatorTimestamp: indicator?.timestamp ?? null,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
