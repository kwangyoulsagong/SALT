import {
  COACH_INDICATOR_TIMEFRAME,
  JUDGMENT_MODES,
  judgmentAssetClassFor,
  krJudgmentHistory,
  staleJudgmentInputs,
  staleKrJudgmentInputs,
  type StaleInput,
  type JudgmentAssetClass,
  type KrJudgmentHistory,
  scoreModeDecision,
  type CoachIndicator,
  type CoachMode,
  type CoachQuote,
  type CoachSentiment,
  type CoachWhaleTransaction,
  type MarketProbe,
  type ModeDecision,
  type ModeDecisionComponent,
} from "../../domain";

/** 대량 체결 표본 수. 원문의 `take: 20` 이다. */
const WHALE_SAMPLE = 20;

export interface SymbolJudgmentMaterials {
  /** 시세의 자산군(F011 슬라이스 4). 국내 주식은 심리 · 대량 체결이 없는 시장이라 재료가 둘이다 */
  assetClass: JudgmentAssetClass;
  /** 국내 주식만 — 판단을 여는 이력(일봉 120 거래일 · 일봉 지표, F011 FR-62) */
  krHistory?: KrJudgmentHistory;
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
  /** 모드별 빠진 재료 — 지표 봉이 모드마다 달라 다르다. 원장이 쓴다. */
  missingByMode: Record<CoachMode, string[]>;
  /** 모드별 항목 기여 — 응답에 싣지 않는다. 원장(`judgment_ledger`)만 쓴다. */
  components: Record<CoachMode, ModeDecisionComponent[]>;
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

  // 국내 주식 일봉 수 — 시세로 자산군을 안 뒤 그 종목들만 한 번 더 센다(groupBy 1회)
  const krSymbols = symbols.filter((symbol) => quotes.get(symbol)?.assetType === "kr_stock");
  const dailyBars = krSymbols.length > 0 ? await market.dailyBarCounts(krSymbols) : new Map<string, number>();

  return new Map(
    symbols.map((symbol, index) => [
      symbol,
      {
        assetClass: judgmentAssetClassFor(quotes.get(symbol)?.assetType),
        ...(quotes.get(symbol)?.assetType === "kr_stock"
          ? {
              krHistory: krJudgmentHistory({
                dailyBars: dailyBars.get(symbol) ?? 0,
                dailyIndicator: longTermIndicators.has(symbol),
              }),
            }
          : {}),
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

/** 모드 하나의 표시 막음 재료 — 판단 화면 · 해설이 **같은 함수**로 만든다(`attachJudgmentTrack` 의 `JudgmentGuards`) */
export interface MaterialGuards {
  staleInputs: StaleInput[];
  modeNotOpen: boolean;
  history?: KrJudgmentHistory;
}

/**
 * 재료가 정하는 막음 — 오래된 재료 · 자산군에 연 모드 · 국내 주식 이력(F010 슬라이스 7 · F011 FR-62 · 63 · 66).
 * 국내 주식 신선도는 거래일로 센다 — 시간 기준이면 장이 닫힌 저녁 · 주말마다 막힌다
 */
export const materialGuards = (
  materials: SymbolJudgmentMaterials,
  mode: CoachMode,
  now: Date
): MaterialGuards => {
  const priceUpdatedAt = materials.quote?.priceUpdatedAt ?? null;
  const staleInputs =
    materials.assetClass === "kr_stock"
      ? staleKrJudgmentInputs({
          priceUpdatedAt,
          dailyIndicatorAt: materials.indicators.long_term?.timestamp ?? null,
          now,
        })
      : staleJudgmentInputs({
          mode,
          priceUpdatedAt,
          indicatorTimestamp: materials.indicators[mode]?.timestamp ?? null,
          now,
        });
  return {
    staleInputs,
    modeNotOpen: !JUDGMENT_MODES[materials.assetClass].includes(mode),
    ...(materials.krHistory ? { history: materials.krHistory } : {}),
  };
};

/** 두 모드 판단. 순수 계산이고 재료만 본다. */
export const judgeSymbol = (
  symbol: string,
  materials: SymbolJudgmentMaterials,
  hasHolding: boolean
): SymbolJudgment => {
  const { quote, sentiment, indicators, whales } = materials;
  // 국내 주식엔 심리 지수 · 대량 체결 수집이 없다 — "빠진 재료"가 아니라 그 시장에 없는 재료다(장기 점수도 안 쓴다)
  const cryptoOnly = materials.assetClass === "crypto";

  // 지표는 모드마다 다른 봉이라 빠짐도 모드마다 다르다. 응답의 `missingData` 는 둘의 합집합이다
  const missingFor = (mode: CoachMode): string[] => {
    const missing: string[] = [];
    if (!quote?.currentPrice) missing.push("price");
    if (cryptoOnly && !sentiment) missing.push("sentiment");
    if (!indicators[mode]) missing.push("technical_indicator");
    if (cryptoOnly && !whales.length) missing.push("whale_flow");
    return missing;
  };
  const missingByMode: Record<CoachMode, string[]> = {
    scalp: missingFor("scalp"),
    long_term: missingFor("long_term"),
  };
  // 응답의 합집합은 그 자산군에 연 모드만 — 국내 주식은 단타를 열지 않았다(F011 FR-63)
  const missingData = [...new Set(JUDGMENT_MODES[materials.assetClass].flatMap((mode) => missingByMode[mode]))];

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

  const scalp = scoreModeDecision({
    ...shared,
    mode: "scalp",
    rsi: rsiFor("scalp"),
    missingData: missingByMode.scalp,
  });
  const longTerm = scoreModeDecision({
    ...shared,
    mode: "long_term",
    rsi: rsiFor("long_term"),
    missingData: missingByMode.long_term,
  });

  return {
    scalp: scalp.decision,
    longTerm: longTerm.decision,
    whaleBuy,
    whaleSell,
    missingData,
    missingByMode,
    components: { scalp: scalp.components, long_term: longTerm.components },
  };
};
