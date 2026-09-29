import {
  COACH_INDICATOR_TIMEFRAME,
  detectMarketRegime,
  LEDGER_REGIME_SYMBOL,
  ledgerDate,
  ledgerDraft,
  ledgerKey,
  type Clock,
  type CoachMode,
  type ForecastReader,
  type JudgmentLedgerDraft,
  type JudgmentLedgerStore,
  type LedgerMaterials,
  type MarketProbe,
  type MarketRegimeState,
  type SymbolRisk,
  type TrackedAssetProbe,
} from "../domain";
import {
  collectJudgmentMaterials,
  judgeSymbol,
  type SymbolJudgmentMaterials,
} from "./lib/judgeSymbols";

const MODES: CoachMode[] = ["scalp", "long_term"];

export interface LedgerPublishResult {
  tracked: number;
  written: number;
  /** 현재가가 없어 발행하지 못한 심볼. 진입가 없는 행은 라벨을 만들 수 없다. */
  skippedNoPrice: string[];
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** 재료를 값 + 발생 시각으로 옮긴다. 지표는 모드의 봉이다(단타 1시간 · 장기 일봉). */
export const ledgerMaterials = (
  m: SymbolJudgmentMaterials,
  mode: CoachMode,
  context: { market?: MarketRegimeState | null; risk?: SymbolRisk | null } = {}
): LedgerMaterials => {
  const { market = null, risk = null } = context;
  const indicator = m.indicators[mode];
  const whaleTimes = m.whales.map((w) => (w.tradedAt ?? w.detectedAt).getTime());
  const sum = (side: "buy" | "sell") =>
    m.whales
      .filter((w) => w.transactionType === side)
      .reduce((acc, w) => acc + Number(w.amountKRW ?? 0), 0);
  return {
    quote: m.quote?.currentPrice
      ? {
          price: m.quote.currentPrice,
          change24h: m.quote.change24h,
          observedAt: iso(m.quote.priceUpdatedAt),
        }
      : null,
    sentiment: m.sentiment
      ? {
          score: m.sentiment.sentimentScore,
          fearGreed: m.sentiment.fearGreedIndex ?? null,
          observedAt: m.sentiment.calculatedAt.toISOString(),
        }
      : null,
    indicator: indicator
      ? {
          timeframe: COACH_INDICATOR_TIMEFRAME[mode],
          rsi14: indicator.rsi14,
          observedAt: indicator.timestamp.toISOString(),
        }
      : null,
    whales: m.whales.length
      ? {
          buyKRW: sum("buy"),
          sellKRW: sum("sell"),
          count: m.whales.length,
          oldestAt: new Date(Math.min(...whaleTimes)).toISOString(),
          newestAt: new Date(Math.max(...whaleTimes)).toISOString(),
        }
      : null,
    market: market
      ? {
          trendOpen: market.trendOpen,
          highVolProbability: market.highVolProbability,
          drawdown365d: market.drawdown365d,
          observedAt: market.asOf.toISOString(),
        }
      : null,
    risk: risk
      ? { annualizedVolatility: risk.annualized, btcBeta: risk.btcBeta, observedAt: risk.asOf.toISOString() }
      : null,
  };
};

/**
 * 추적 자산의 두 모드 판단을 **매일** 원장에 발행한다 (F010 슬라이스 1 · `SRV-REQ-024` FR-178).
 *
 * 워커가 10분마다 불러도 된다 — 그날 이미 발행한 조합은 재료를 다시 모으지 않는다. 판단 계산은 화면 · 스냅샷과
 * **같은 함수**(`collectJudgmentMaterials` · `judgeSymbol`)다. 원장만의 판단 경로를 두지 않는다.
 * 국면 태그는 BTC 의 장기 모드 재료(일봉 RSI · 공포탐욕)로 하루 한 번 정한다. 슬라이스 2 부터 `forecast` 의
 * 국면(200일선 · HMM) · 종목 변동성 · BTC 베타도 재료 칸에 같이 남긴다 — 점수에는 쓰지 않는다.
 */
export class PublishJudgmentLedger {
  constructor(
    private readonly tracked: TrackedAssetProbe,
    private readonly market: MarketProbe,
    private readonly ledger: JudgmentLedgerStore,
    private readonly now: Clock = () => new Date(),
    /** 국면 · 종목 변동성 재료(F010 슬라이스 2). 실패해도 원장은 나간다 — 그 칸만 `null` */
    private readonly forecasts: Pick<ForecastReader, "marketRegime" | "symbolRisk"> | null = null
  ) {}

  async execute(): Promise<LedgerPublishResult> {
    const symbols = await this.tracked.listTrackedSymbols();
    if (symbols.length === 0) return { tracked: 0, written: 0, skippedNoPrice: [] };

    const now = this.now();
    const published = await this.ledger.publishedOn(ledgerDate(now));
    const due = symbols.filter((s) => MODES.some((m) => !published.has(ledgerKey(s, m))));
    if (due.length === 0) return { tracked: symbols.length, written: 0, skippedNoPrice: [] };

    const wanted = due.includes(LEDGER_REGIME_SYMBOL) ? due : [...due, LEDGER_REGIME_SYMBOL];
    const [materials, market, risk] = await Promise.all([
      collectJudgmentMaterials(this.market, wanted),
      this.forecasts ? this.forecasts.marketRegime().catch(() => null) : null,
      this.forecasts ? this.forecasts.symbolRisk(due).catch(() => null) : null,
    ]);
    const btc = materials.get(LEDGER_REGIME_SYMBOL);
    const regime = detectMarketRegime(btc?.indicators.long_term, btc?.sentiment);

    const drafts: JudgmentLedgerDraft[] = [];
    const skippedNoPrice: string[] = [];
    for (const symbol of due) {
      const material = materials.get(symbol);
      const entryPrice = material?.quote?.currentPrice;
      if (!material || !entryPrice) {
        skippedNoPrice.push(symbol);
        continue;
      }
      // 보유 여부는 점수에 들어가지 않는다(`makeModeDecision`) — 스냅샷과 같이 false
      const judgment = judgeSymbol(symbol, material, false);
      const byMode = { scalp: judgment.scalp, long_term: judgment.longTerm };
      for (const mode of MODES) {
        if (published.has(ledgerKey(symbol, mode))) continue;
        drafts.push(
          ledgerDraft({
            decision: byMode[mode],
            components: judgment.components[mode],
            materials: ledgerMaterials(material, mode, { market, risk: risk?.get(symbol) ?? null }),
            missingData: judgment.missingByMode[mode],
            regime,
            entryPrice,
            entryObservedAt: material.quote?.priceUpdatedAt ?? null,
            now,
          })
        );
      }
    }

    const written = await this.ledger.saveEntries(drafts);
    return { tracked: symbols.length, written, skippedNoPrice };
  }
}
