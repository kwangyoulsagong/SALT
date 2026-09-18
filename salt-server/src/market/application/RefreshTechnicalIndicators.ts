import { logger } from "../../shared/config/logger";
import {
  calculateIndicators,
  MIN_CANDLES_FOR_INDICATORS,
  type IndicatorRepository,
  type MarketAssetRepository,
  type PriceHistoryRepository,
} from "../domain";

/** 지표를 계산하는 타임프레임. 원문 워커가 돌리던 두 개다. */
const TIMEFRAMES = ["m5", "h1"] as const;
/** 심볼 배치 크기. 원문 워커 상수다. */
const BATCH = 20;
const CANDLE_WINDOW = 100;

/**
 * 기술 지표 갱신.
 *
 * ## 워커에 있던 절차가 여기로 왔다
 *
 * 원문은 **활성 자산 조회·배치 분할·타임프레임 반복이 워커 안**에 있었다. 워커가
 * 유스케이스를 담으면 같은 일을 HTTP 나 재계산 요청으로 부를 수 없고, 워커를 켜야만
 * 재현된다. FR-5 — 워커는 스케줄과 락만 갖는다.
 */
export class RefreshTechnicalIndicators {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly prices: PriceHistoryRepository,
    private readonly indicators: IndicatorRepository
  ) {}

  async execute(): Promise<{ symbols: number }> {
    const symbols = await this.assets.activeSymbols();
    if (!symbols.length) {
      logger.info("No assets found");
      return { symbols: 0 };
    }

    for (let i = 0; i < symbols.length; i += BATCH) {
      const batch = symbols.slice(i, i + BATCH);
      await Promise.all(batch.map((symbol) => this.refreshSymbol(symbol)));
    }

    return { symbols: symbols.length };
  }

  /** 한 심볼이 실패해도 배치의 나머지는 돈다 — 원문 워커의 try/catch 위치와 같다. */
  private async refreshSymbol(symbol: string) {
    for (const timeframe of TIMEFRAMES) {
      try {
        await this.refreshOne(symbol, timeframe);
      } catch (error) {
        logger.error(`Indicator error for ${symbol}`, error);
      }
    }
  }

  private async refreshOne(symbol: string, timeframe: string) {
    const candles = await this.prices.recentCandles(
      symbol,
      timeframe,
      CANDLE_WINDOW
    );
    if (candles.length < MIN_CANDLES_FOR_INDICATORS) return;

    // 저장은 최신이 앞이고, 지표 계산은 오래된 것이 앞이다
    const closes = candles.map((c) => c.close).reverse();
    const volumes = candles.map((c) => c.volume ?? 0).reverse();
    const latest = candles[0];

    await this.indicators.upsert({
      symbol,
      assetType: latest.assetType,
      timeframe,
      timestamp: latest.timestamp,
      indicators: calculateIndicators(closes, volumes),
    });
  }
}
