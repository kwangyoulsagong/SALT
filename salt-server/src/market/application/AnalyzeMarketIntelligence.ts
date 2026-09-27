import { logger } from "../../shared/config/logger";
import {
  calculateSentimentScore,
  calculateSmartMoneyIndex,
  interpretSentiment,
  interpretSmartMoney,
  volatilityOf,
  type ExchangeQuotePort,
  type FearGreedPort,
  type MarketAssetRepository,
  type SentimentRepository,
  type Trade,
  type TradeHistoryPort,
  type WatchlistRepository,
  type WhaleTransactionRecord,
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

    // 전부 저장한다(F010 슬라이스 1 — 상한 10 은 표본을 버렸다). 체결 id 로 중복이 막혀
    // 워커 수집(`CollectWhaleTrades`)과 겹쳐도 한 번만 남는다
    await this.whales.saveMany(largeTrades.map((trade) => toWhaleRecord(symbol, trade)));

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

const toWhaleRecord = (symbol: string, trade: Trade): WhaleTransactionRecord => ({
  symbol,
  transactionType: trade.side,
  amount: trade.volume,
  amountKRW: trade.price * trade.volume,
  exchange: "upbit",
  tradedAt: trade.tradedAt,
  sequentialId: trade.sequentialId,
});

/** 한 회차 수집 범위 — 거래대금 상위. 관심 목록은 여기에 더한다. */
const WHALE_TOP_SYMBOLS = 50;
/**
 * 심볼당 페이지 상한(500건 × 10). 넘으면 `truncated` 로 남긴다. 5분 주기에 BTC 도 보통 2~6쪽이다.
 * 업비트 조회 한도는 IP 전체의 것이다 — 개발 중 서버가 둘이면 한 회차가 5분을 넘겨 429 가 났다(2026-09-29).
 */
const WHALE_MAX_PAGES = 10;
/**
 * 재기동 뒤 저장된 대형 체결이 이보다 오래됐으면 여기까지만 거슬러 받는다. 24시간이면 첫 회차가 50종목 × 상한을
 * 다 채웠다 — 그 사이 체결은 이미 지나간 것이고, 이 수집의 목적은 **앞으로의** 빈틈 없는 기록이다.
 */
const WHALE_FIRST_LOOKBACK_MS = 3600_000;

export interface WhaleCollectionResult {
  symbols: number;
  saved: number;
  /** 페이지 상한에 걸려 사이 체결이 빠진 심볼. */
  truncated: string[];
  failed: string[];
}

/**
 * 대형 체결 수집 — 워커가 5분마다(F010 슬라이스 1 · `SRV-REQ-024` FR-177).
 *
 * **전에는 화면이 `/smart-money` 를 부를 때만 저장했다.** 그래서 4개월 동안 15종목 291건뿐이었고, 저장 시각이
 * 체결 시각이 아니라 같은 체결이 호출마다 다시 쌓였다. 이제 거래대금 상위 + 관심 종목을 워커가 돌며, 심볼마다
 * 지난 회차에 **훑은** 마지막 체결 뒤부터 거래소 페이지를 끝까지 넘겨 5천만원 이상을 **전부** 남긴다.
 *
 * 재개 지점은 "마지막 **대형** 체결"이 아니다 — 대형 체결이 드문 종목은 그게 몇 시간 전이라 매 회차 수천 건을
 * 다시 훑어 페이지 상한에 걸렸다(2026-09-29 실 DB). 훑은 지점은 프로세스 메모리에 둔다. 재기동 뒤 첫 회차만
 * 저장된 대형 체결(없으면 24시간 전)부터 한 번 훑고, 겹친 체결은 체결 id 유니크가 버린다.
 */
export class CollectWhaleTrades {
  /** 심볼별 지난 회차에 훑은 가장 최근 체결 시각. */
  private readonly scanned = new Map<string, Date>();

  constructor(
    private readonly trades: TradeHistoryPort,
    private readonly assets: MarketAssetRepository,
    private readonly watchlist: WatchlistRepository,
    private readonly whales: WhaleTransactionRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(): Promise<WhaleCollectionResult> {
    const [top, watched] = await Promise.all([
      this.assets.topByTradeValue("crypto", WHALE_TOP_SYMBOLS),
      this.watchlist.distinctSymbols("crypto"),
    ]);
    const symbols = [...new Set([...top, ...watched])];
    const last = await this.whales.latestTradedAt(symbols);
    const firstSince = new Date(this.now().getTime() - WHALE_FIRST_LOOKBACK_MS);
    const resumeFrom = (symbol: string): Date => {
      const scanned = this.scanned.get(symbol);
      if (scanned) return scanned;
      const stored = last.get(symbol);
      return stored && stored > firstSince ? stored : firstSince;
    };

    let saved = 0;
    const truncated: string[] = [];
    const failed: string[] = [];
    // 순차 — 거래소 한도는 프로세스 전체 것이고 페이서가 이미 채운다
    for (const symbol of symbols) {
      try {
        const since = resumeFrom(symbol);
        const page = await this.trades.tradesSince(symbol, since, WHALE_MAX_PAGES);
        if (page.truncated) truncated.push(symbol);
        const newest = page.trades.reduce<Date | null>(
          (acc, t) => (acc === null || t.tradedAt > acc ? t.tradedAt : acc),
          null
        );
        if (newest) this.scanned.set(symbol, newest);
        const large = page.trades.filter((t) => t.price * t.volume >= LARGE_TRADE_KRW);
        saved += await this.whales.saveMany(large.map((t) => toWhaleRecord(symbol, t)));
      } catch (error) {
        failed.push(symbol);
        logger.warn(`대형 체결 수집 실패 ${symbol}: ${(error as Error).message}`);
      }
    }
    return { symbols: symbols.length, saved, truncated, failed };
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
