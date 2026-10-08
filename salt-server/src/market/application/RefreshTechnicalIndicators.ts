import { logger } from "../../shared/config/logger";
import {
  aggregateCandles,
  calculateIndicators,
  MIN_CANDLES_FOR_INDICATORS,
  type IndicatorRepository,
  type MarketAssetRepository,
  type PriceHistoryRepository,
  type PriceTimeframe,
} from "../domain";

const HOUR_MS = 3600_000;
const CANDLE_WINDOW = 100;

/**
 * 지표 주기 ← 캔들 주기.
 *
 * 원문은 지표 이름(`m5` · `h1`)으로 캔들을 조회했는데 캔들은 `5m` · `1d` 로 저장된다 — 그래서 **지표가 한 번도
 * 계산되지 않았다**(F010 슬라이스 0 에서 발견, `technical_indicators` 0행). 여기서 둘을 명시적으로 잇는다.
 * 1시간봉은 수집하지 않으므로 5분봉 12개를 묶어 만든다(`aggregateCandles`).
 */
const TARGETS: ReadonlyArray<{
  indicator: "m5" | "h1" | "d1";
  candle: PriceTimeframe;
  take: number;
  bucketMs: number | null;
}> = [
  { indicator: "m5", candle: "5m", take: CANDLE_WINDOW, bucketMs: null },
  { indicator: "h1", candle: "5m", take: CANDLE_WINDOW * 12, bucketMs: HOUR_MS },
  { indicator: "d1", candle: "1d", take: CANDLE_WINDOW, bucketMs: null },
];
/** 심볼 배치 크기. 원문 워커 상수다. */
const BATCH = 20;

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
    private readonly indicators: IndicatorRepository,
    /**
     * 국내 주식 대상(F011 FR-60) — 시세 유니버스. 꺼져 있으면 `null`. 국내 5분봉은 정규장 체결만 저장돼
     * (`krFiveMinuteBucket` 09:00~15:25) 1시간봉도 정규장만 묶이고, 일봉은 거래일 봉만 있다 — 여기서 거를 것이 없다.
     * 유니버스를 못 읽어도 코인 지표는 돈다
     */
    private readonly krSymbols: (() => Promise<string[]>) | null = null
  ) {}

  async execute(): Promise<{ symbols: number }> {
    const [crypto, kr] = await Promise.all([
      this.assets.activeSymbols(),
      this.krSymbols
        ? this.krSymbols().catch((error) => {
            logger.error("Indicator kr_stock universe error", error);
            return [];
          })
        : [],
    ]);
    const symbols = [...new Set([...crypto, ...kr])];
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
    for (const target of TARGETS) {
      try {
        await this.refreshOne(symbol, target);
      } catch (error) {
        logger.error(`Indicator error for ${symbol} ${target.indicator}`, error);
      }
    }
  }

  private async refreshOne(symbol: string, target: (typeof TARGETS)[number]) {
    const raw = await this.prices.recentCandles(symbol, target.candle, target.take);
    if (raw.length === 0) return;

    const candles =
      target.bucketMs === null ? raw : aggregateCandles(raw, target.bucketMs);
    if (candles.length < MIN_CANDLES_FOR_INDICATORS) return;

    // 저장은 최신이 앞이고, 지표 계산은 오래된 것이 앞이다
    const closes = candles.map((c) => c.close).reverse();
    const volumes = candles.map((c) => c.volume ?? 0).reverse();

    await this.indicators.upsert({
      symbol,
      assetType: raw[0].assetType,
      timeframe: target.indicator,
      timestamp: candles[0].timestamp,
      indicators: calculateIndicators(closes, volumes),
    });
  }
}
