import {
  makeModeDecision,
  type CoachIndicator,
  type CoachQuote,
  type CoachSentiment,
  type CoachWhaleTransaction,
  type MarketProbe,
  type ModeDecision,
} from "../../domain";

/** 대량 체결 표본 수. 원문의 `take: 20` 이다. */
const WHALE_SAMPLE = 20;

export interface SymbolJudgmentMaterials {
  quote: CoachQuote | undefined;
  sentiment: CoachSentiment | undefined;
  indicator: CoachIndicator | undefined;
  whales: CoachWhaleTransaction[];
}

export interface SymbolJudgment {
  scalp: ModeDecision;
  longTerm: ModeDecision;
  whaleBuy: number;
  whaleSell: number;
  /** 빠진 재료. **숨기지 않고 내려보낸다** — 판단의 전제를 드러내는 값이다. */
  missingData: string[];
}

/**
 * 판단 재료를 여러 심볼에 대해 모은다.
 *
 * 대량 체결만 **심볼마다** 부른다. `recentWhales` 의 `limit` 은 전체 상한이라 여러 심볼을
 * 한 번에 부르면 거래가 많은 종목이 20건을 다 가져가고, 화면(한 종목 조회)과 워커
 * (여러 종목)의 판단이 달라진다. 같은 종목은 어디서 불러도 같은 판단이어야 한다.
 */
export const collectJudgmentMaterials = async (
  market: MarketProbe,
  symbols: string[]
): Promise<Map<string, SymbolJudgmentMaterials>> => {
  const [quotes, sentiments, indicators, whalesBySymbol] = await Promise.all([
    market.quotes(symbols),
    market.latestSentiments(symbols),
    market.latestIndicators(symbols),
    Promise.all(
      symbols.map((symbol) => market.recentWhales([symbol], WHALE_SAMPLE))
    ),
  ]);

  return new Map(
    symbols.map((symbol, index) => [
      symbol,
      {
        quote: quotes.get(symbol),
        sentiment: sentiments.get(symbol),
        indicator: indicators.get(symbol),
        whales: whalesBySymbol[index] ?? [],
      },
    ])
  );
};

/** 두 모드 판단. 순수 계산이고 재료만 본다. */
export const judgeSymbol = (
  symbol: string,
  materials: SymbolJudgmentMaterials,
  hasHolding: boolean
): SymbolJudgment => {
  const { quote, sentiment, indicator, whales } = materials;

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
    hasHolding,
    missingData,
  };

  return {
    scalp: makeModeDecision({ ...shared, mode: "scalp" }),
    longTerm: makeModeDecision({ ...shared, mode: "long_term" }),
    whaleBuy,
    whaleSell,
    missingData,
  };
};
