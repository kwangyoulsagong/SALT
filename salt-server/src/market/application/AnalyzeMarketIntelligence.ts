import { logger } from "../../shared/config/logger";
import {
  calculateSentimentScore,
  calculateSmartMoneyIndex,
  interpretSentiment,
  interpretSmartMoney,
  volatilityOf,
  type ExchangeQuotePort,
  type FearGreedPort,
  type SentimentRepository,
  type WhaleTransactionRepository,
} from "../domain";

/** 심리 점수의 평균 거래량 분모가 되는 일수. 원문 상수다. */
const AVG_VOLUME_DAYS = 7;

/**
 * 시장 심리 계산 + 저장.
 *
 * 외부 호출(거래소·Fear&Greed)이 전부 **트랜잭션 밖**이다 (FR-42). 점수 판정은
 * `domain/Sentiment` 에 있고 이 유스케이스는 **입력을 모아 넘기고 결과를 저장**한다.
 */
export class CalculateSentiment {
  constructor(
    private readonly exchange: ExchangeQuotePort,
    private readonly fearGreed: FearGreedPort,
    private readonly sentiments: SentimentRepository
  ) {}

  async execute(symbol: string) {
    logger.info(`😨 Calculating sentiment for ${symbol}`);

    const [fearGreed, quote, dailyTradeValues] = await Promise.all([
      this.fearGreed.current(),
      this.exchange.currentPrice(symbol),
      this.exchange.dailyTradeValues(symbol, AVG_VOLUME_DAYS),
    ]);

    const avgVolume =
      dailyTradeValues.reduce((sum, value) => sum + value, 0) / AVG_VOLUME_DAYS;
    const volatility = volatilityOf(
      quote.high24h,
      quote.low24h,
      quote.currentPrice
    );

    const score = calculateSentimentScore({
      priceChange: quote.change24h,
      volatility,
      volume: quote.tradeValue24h,
      avgVolume,
      fearGreed: fearGreed?.value,
    });

    const saved = await this.sentiments.save({
      symbol,
      sentimentScore: score.total,
      fearGreedIndex: fearGreed?.value,
      volatility,
      volume24h: quote.tradeValue24h,
      priceChange24h: quote.change24h,
      sentimentLabel: score.label,
    });

    return {
      ...saved,
      interpretation: interpretSentiment(score.total),
      components: score.components,
    };
  }
}

/** 대량 체결로 보는 기준. 원문 상수(5천만원)다. */
const LARGE_TRADE_KRW = 50_000_000;
/** 저장하는 대량 체결 수. 전부 저장하면 한 번 호출에 200행이 들어간다. */
const WHALE_SAVE_LIMIT = 10;
const RECENT_TRADE_COUNT = 200;

/**
 * 스마트 머니 추적.
 *
 * 대량 체결 기준(금액)은 **유스케이스의 판단**이다 — 거래소가 정해 주는 값이 아니고,
 * 도메인 점수 계산은 이미 걸러진 개수만 받는다.
 */
export class TrackSmartMoney {
  constructor(
    private readonly exchange: ExchangeQuotePort,
    private readonly whales: WhaleTransactionRepository
  ) {}

  async execute(symbol: string) {
    logger.info(`🐋 Tracking smart money for ${symbol}`);

    const [trades, pressure] = await Promise.all([
      this.exchange.recentTrades(symbol, RECENT_TRADE_COUNT),
      this.exchange.orderbookPressure(symbol),
    ]);

    const largeTrades = trades.filter(
      (trade) => trade.price * trade.volume >= LARGE_TRADE_KRW
    );
    const largeBuys = largeTrades.filter((t) => t.side === "buy");
    const largeSells = largeTrades.filter((t) => t.side === "sell");

    const index = calculateSmartMoneyIndex({
      largeBuys: largeBuys.length,
      largeSells: largeSells.length,
      bidPressure: pressure.bids,
      askPressure: pressure.asks,
    });

    await this.whales.saveMany(
      largeTrades.slice(0, WHALE_SAVE_LIMIT).map((trade) => ({
        symbol,
        transactionType: trade.side,
        amount: trade.volume,
        amountKRW: trade.price * trade.volume,
        exchange: "upbit",
      }))
    );

    return {
      smartMoneyIndex: index,
      signals: {
        largeTrades: largeTrades.length,
        largeBuys: largeBuys.length,
        largeSells: largeSells.length,
        orderbookRatio: (pressure.bids / pressure.asks).toFixed(2),
      },
      interpretation: interpretSmartMoney(index.score),
    };
  }
}

export class GetSentimentHistory {
  constructor(private readonly sentiments: SentimentRepository) {}

  execute(symbol: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.sentiments.findHistorySince(symbol, since);
  }
}

export class ListWhaleTransactions {
  constructor(private readonly whales: WhaleTransactionRepository) {}

  execute(symbol: string, limit = 20) {
    return this.whales.findRecent(symbol, limit);
  }
}
