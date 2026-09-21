import type {
  MarketApi,
  PriceTimeframe,
} from "../../market/application/api";
import type {
  CloseDistribution,
  CoachIndicator,
  CoachQuote,
  CoachSentiment,
  CoachWhaleTransaction,
  GaugeForwardReturn,
  MarketProbe,
  ZoneTimeframe,
} from "../domain";

/**
 * `market` → `coach` ACL.
 *
 * ## 이름에 컨텍스트를 쓰지 않는다
 *
 * `MarketContextAdapter` 가 아니라 **무엇을 가져오는지**로 지었다
 * (`ddd-infrastructure.md` §5). 같은 컨텍스트를 감싸는 ACL 이 나중에 둘이 되어도
 * 이름이 겹치지 않는다.
 *
 * ## 지표는 `m5` 로 고정한다
 *
 * 지표는 `m5` 와 `h1` 두 주기로 저장된다. 주기를 안 정하고 "최신"을 고르면 같은
 * 심볼이 호출마다 다른 주기의 RSI 를 준다. 원문(`ai-coach-feature.extractor`)이
 * `Timeframe.m5` 로 못 박았고 **그 선택을 여기 한 곳에 남긴다.**
 */
const COACH_INDICATOR_TIMEFRAME = "m5";

/**
 * 코치는 주기를 `m5` · `d1` 로 부르고 `price_history.timeframe` 은 `5m` · `1d` 다.
 * 계약(`SRV-REQ-025` `lookback.timeframe`)이 앞의 것이라 번역을 여기 한 곳에 둔다.
 */
const PRICE_TIMEFRAME: Record<ZoneTimeframe, PriceTimeframe> = {
  m5: "5m",
  d1: "1d",
};

export class MarketSignalAdapter implements MarketProbe {
  constructor(private readonly market: MarketApi) {}

  async latestIndicators(
    symbols: string[]
  ): Promise<Map<string, CoachIndicator>> {
    const rows = await this.market.latestIndicators(
      symbols,
      COACH_INDICATOR_TIMEFRAME
    );

    return new Map(
      rows.map((row) => [
        row.symbol,
        {
          rsi14: row.rsi14,
          ma20: row.ma20,
          ma50: row.ma50,
          volumeAvg20: row.volumeAvg20,
          timestamp: row.timestamp,
        },
      ])
    );
  }

  async latestSentiments(
    symbols: string[]
  ): Promise<Map<string, CoachSentiment>> {
    const rows = await this.market.latestSentiments(symbols);

    return new Map(
      rows.map((row) => [
        row.symbol,
        {
          sentimentScore: row.sentimentScore,
          fearGreedIndex: row.fearGreedIndex,
          sentimentLabel: row.sentimentLabel,
          priceChange24h: row.priceChange24h,
          calculatedAt: row.calculatedAt,
        },
      ])
    );
  }

  async quotes(symbols: string[]): Promise<Map<string, CoachQuote>> {
    const rows = await this.market.assetQuotes(symbols);
    return new Map(rows.map((row) => [row.symbol, row]));
  }

  async recentWhales(
    symbols: string[],
    limit: number
  ): Promise<CoachWhaleTransaction[]> {
    const rows = await this.market.recentWhalesForSymbols(symbols, limit);

    return rows.map((row) => ({
      symbol: row.symbol,
      transactionType: row.transactionType,
      amountKRW: row.amountKRW,
      detectedAt: row.detectedAt,
    }));
  }

  async highestCloseSince(
    symbols: string[],
    since: Date
  ): Promise<Map<string, number>> {
    const rows = await this.market.highestCloseSince(symbols, since);
    return new Map(rows.map((row) => [row.symbol, row.close]));
  }

  closeAtOrAfter(symbol: string, at: Date): Promise<number | null> {
    return this.market.closeAtOrAfter(symbol, at);
  }

  async latestCloses(symbols: string[]): Promise<Map<string, number>> {
    const rows = await this.market.latestCloses(symbols);
    return new Map(rows.map((row) => [row.symbol, row.close]));
  }

  sentimentForwardReturns(query: {
    bucketWidth: number;
    horizonDays: number;
    since: Date;
  }): Promise<GaugeForwardReturn[]> {
    return this.market.sentimentForwardReturns(query);
  }

  closePercentiles(
    symbol: string,
    timeframe: ZoneTimeframe,
    since: Date,
    fractions: number[]
  ): Promise<CloseDistribution> {
    return this.market.closePercentiles(
      symbol,
      PRICE_TIMEFRAME[timeframe],
      since,
      fractions
    );
  }
}
