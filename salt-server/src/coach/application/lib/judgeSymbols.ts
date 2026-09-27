import {
  COACH_INDICATOR_TIMEFRAME,
  makeModeDecision,
  type CoachIndicator,
  type CoachMode,
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
  /** 모드별 지표 — 단타는 1시간봉, 장기는 일봉(`COACH_INDICATOR_TIMEFRAME`). */
  indicators: Record<CoachMode, CoachIndicator | undefined>;
  whales: CoachWhaleTransaction[];
}

/** 화면 · 해설이 한 모드의 지표를 꺼낼 때. */
export const indicatorFor = (
  materials: SymbolJudgmentMaterials,
  mode: CoachMode
): CoachIndicator | undefined => materials.indicators[mode];

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
  const [quotes, sentiments, scalpIndicators, longTermIndicators, whalesBySymbol] =
    await Promise.all([
      market.quotes(symbols),
      market.latestSentiments(symbols),
      market.latestIndicators(symbols, COACH_INDICATOR_TIMEFRAME.scalp),
      market.latestIndicators(symbols, COACH_INDICATOR_TIMEFRAME.long_term),
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
        indicators: {
          scalp: scalpIndicators.get(symbol),
          long_term: longTermIndicators.get(symbol),
        },
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
  const { quote, sentiment, indicators, whales } = materials;

  // 지표는 모드마다 다른 봉이라 빠짐도 모드마다 다르다. 응답의 `missingData` 는 둘의 합집합이다
  const missingFor = (mode: CoachMode): string[] => {
    const missing: string[] = [];
    if (!quote?.currentPrice) missing.push("price");
    if (!sentiment) missing.push("sentiment");
    if (!indicators[mode]) missing.push("technical_indicator");
    if (!whales.length) missing.push("whale_flow");
    return missing;
  };
  const missingByMode: Record<CoachMode, string[]> = {
    scalp: missingFor("scalp"),
    long_term: missingFor("long_term"),
  };
  const missingData = [...new Set([...missingByMode.scalp, ...missingByMode.long_term])];

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
    whaleBuy,
    whaleSell,
    hasHolding,
  };
  const rsiFor = (mode: CoachMode): number | undefined => {
    const rsi = indicators[mode]?.rsi14;
    return rsi ? Number(rsi) : undefined;
  };

  return {
    scalp: makeModeDecision({
      ...shared,
      mode: "scalp",
      rsi: rsiFor("scalp"),
      missingData: missingByMode.scalp,
    }),
    longTerm: makeModeDecision({
      ...shared,
      mode: "long_term",
      rsi: rsiFor("long_term"),
      missingData: missingByMode.long_term,
    }),
    whaleBuy,
    whaleSell,
    missingData,
  };
};
