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
  IndicatorTimeframe,
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
 * ## 지표 주기는 부르는 쪽이 정한다
 *
 * 원문은 여기서 `m5` 로 못 박았다 — 두 모드가 같은 5분봉 RSI 로 24시간 · 30일을 판단했다.
 * 이제 주기는 모드의 것이고(`COACH_INDICATOR_TIMEFRAME`) 이 어댑터는 값을 그대로 넘긴다.
 * 지표 테이블의 `timeframe` 이름(`h1` · `d1`)과 코치 이름이 같아 번역이 없다.
 */

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
    symbols: string[],
    timeframe: IndicatorTimeframe
  ): Promise<Map<string, CoachIndicator>> {
    const rows = await this.market.latestIndicators(symbols, timeframe);

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

  /** 국내 주식 코드는 `market` 이 `kr_stock_quotes` 에서 같은 모양으로 준다(F011 슬라이스 4) */
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
      ...(row.tradedAt ? { tradedAt: row.tradedAt } : {}),
    }));
  }

  async highestCloseSince(
    symbols: string[],
    since: Date
  ): Promise<Map<string, number>> {
    const rows = await this.market.highestCloseSince(symbols, since);
    return new Map(rows.map((row) => [row.symbol, row.close]));
  }

  closeAtOrAfter(symbol: string, at: Date, timeframe: ZoneTimeframe): Promise<number | null> {
    return this.market.closeAtOrAfter(symbol, at, PRICE_TIMEFRAME[timeframe]);
  }

  closeAtOrBefore(
    symbol: string,
    at: Date,
    timeframe: ZoneTimeframe,
    notBefore: Date
  ): Promise<{ close: number; timestamp: Date } | null> {
    return this.market.closeAtOrBefore(symbol, at, PRICE_TIMEFRAME[timeframe], notBefore);
  }

  dailyBarCounts(symbols: string[]): Promise<Map<string, number>> {
    return this.market.candleCounts(symbols, "1d");
  }

  highestCloseBetween(symbol: string, from: Date, to: Date): Promise<number | null> {
    return this.market.highestCloseBetween(symbol, from, to);
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
