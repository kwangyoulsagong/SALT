import { logger } from "../../shared/config/logger";
import type {
  ExchangeQuotePort,
  MarketAssetRepository,
  PriceHistoryRepository,
  PriceTimeframe,
} from "../domain";

/**
 * 상장 목록 동기화.
 *
 * 목록에서 사라진 심볼은 **지우지 않고 `isActive=false` + `delistedAt`** 으로 남긴다.
 * 원장이 그 심볼을 참조하고 있고, 상폐가 과거 거래를 없던 일로 만들지 않는다.
 */
export class SyncMarketListings {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort
  ) {}

  async execute() {
    const listings = await this.exchange.krwMarkets();

    await this.assets.upsertListings(listings);
    await this.assets.markDelistedExcept(listings.map((m) => m.symbol));

    logger.info(`🔁 Market sync completed. (${listings.length} markets)`);
    return { markets: listings.length };
  }
}

/** 거래소 티커 배치 크기. 원문 상수다. */
const PRICE_BATCH = 100;
const PRICE_BATCH_PAUSE_MS = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 전체 마켓 시세 갱신 (워커가 1분마다 부른다).
 *
 * 배치 사이에 쉬는 것은 **거래소 레이트리밋 때문**이고, 그래서 이 유스케이스는 빠르게
 * 끝나지 않는다. 트랜잭션으로 감싸지 않는 이유이기도 하다 (FR-42).
 */
export class UpdateAllMarketPrices {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort
  ) {}

  async execute() {
    const symbols = await this.assets.activeSymbols();

    for (let i = 0; i < symbols.length; i += PRICE_BATCH) {
      const batch = symbols.slice(i, i + PRICE_BATCH);
      const quotes = await this.exchange.currentPrices(batch);
      await this.assets.applyQuotes(quotes);

      if (i + PRICE_BATCH < symbols.length) await sleep(PRICE_BATCH_PAUSE_MS);
    }

    return { updated: symbols.length };
  }
}

/** 수집 대상 타임프레임과 개수. 원문 워커 상수다. */
const COLLECT_TARGETS: Array<{ timeframe: PriceTimeframe; count: number }> = [
  { timeframe: "5m", count: 288 },
  { timeframe: "1d", count: 120 },
];

/** 보관 정책. 5분봉 30일 · 일봉 2년 (원문). */
const RETENTION = [
  { timeframe: "5m", interval: "30 days" },
  { timeframe: "1d", interval: "2 years" },
];

const SYMBOL_BATCH = 10;
const SYMBOL_BATCH_PAUSE_MS = 150;
const TIMEFRAME_PAUSE_MS = 50;

/**
 * 캔들 수집.
 *
 * 원문은 `price-history.worker` 안에 있었고 거래소 응답의 `timestamp ?? date` 분기와
 * KST 문자열 파싱까지 워커가 들고 있었다. **그 번역은 `infrastructure` 의 일**이라
 * 어댑터로 내렸고, 여기 남은 것은 배치 크기·쉼·보관 정책이다.
 */
export class CollectPriceHistory {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort,
    private readonly prices: PriceHistoryRepository
  ) {}

  async execute() {
    const symbols = await this.assets.activeSymbols("crypto");

    for (let i = 0; i < symbols.length; i += SYMBOL_BATCH) {
      const batch = symbols.slice(i, i + SYMBOL_BATCH);
      await Promise.all(batch.map((symbol) => this.collectSymbol(symbol)));
      await sleep(SYMBOL_BATCH_PAUSE_MS);
    }

    await this.prices.purgeOlderThan(RETENTION);
    return { symbols: symbols.length };
  }

  /**
   * 한 심볼이 실패해도 회차가 멈추지 않는다.
   *
   * > **원문은 멈췄다.** `collectSymbol` 에 try/catch 가 없어 심볼 하나의 일시적 실패가
   * > `Promise.all` 을 통해 `run()` 의 catch 까지 올라갔고, 그 뒤의 **보관 정책 삭제
   * > (`purgeOlderThan`)가 건너뛰어졌다.** 부팅 직후 네 작업이 동시에 거래소를 때리기
   * > 때문에 이 실패는 드물지 않다 — 실제로 이 이관을 검증하는 기동에서도 났다.
   * > 그래서 5분봉 30일·일봉 2년 보관 정책이 실제로 돈 적이 있는지 알 수 없다.
   * >
   * > `workers-external.md` — "실패한 batch 는 로그를 남기고 다음 batch 또는 다음 주기
   * > 실행이 가능해야 한다".
   */
  private async collectSymbol(symbol: string) {
    for (const target of COLLECT_TARGETS) {
      try {
        const candles = await this.exchange.candlesByTimeframe(
          symbol,
          target.timeframe,
          target.count
        );
        await this.prices.upsertCandles(
          symbol.toUpperCase(),
          "crypto",
          target.timeframe,
          candles
        );
      } catch (error) {
        logger.warn(`캔들 수집 실패 — ${symbol} ${target.timeframe}`, error);
      }
      await sleep(TIMEFRAME_PAUSE_MS);
    }
  }
}
