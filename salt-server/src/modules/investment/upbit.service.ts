import axios from "axios";
import { logger } from "../../config/logger";

const UPBIT_API_URL = "https://api.upbit.com/v1";

export class UpbitService {
  /**
   * 현재가 정보 조회
   */
  async getCurrentPrice(symbol: string) {
    try {
      const market = `KRW-${symbol.toUpperCase()}`;
      const response = await axios.get(`${UPBIT_API_URL}/ticker`, {
        params: { markets: market },
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("Symbol not found");
      }

      const ticker = response.data[0];
      return {
        symbol,
        market: ticker.market,
        currentPrice: ticker.trade_price,
        change24h: ticker.signed_change_rate * 100,
        high24h: ticker.high_price,
        low24h: ticker.low_price,
        volume24h: ticker.acc_trade_volume_24h,
        timestamp: new Date(ticker.timestamp),
      };
    } catch (error: any) {
      logger.error("Upbit API error:", error.message);
      throw new Error("Failed to fetch price from Upbit");
    }
  }

  /**
   * 일봉 차트 데이터 조회
   */
  async getDailyCandles(symbol: string, count: number = 30) {
    try {
      const market = `KRW-${symbol.toUpperCase()}`;
      const response = await axios.get(`${UPBIT_API_URL}/candles/days`, {
        params: { market, count },
      });

      return response.data.map((candle: any) => ({
        date: candle.candle_date_time_kst,
        open: candle.opening_price,
        high: candle.high_price,
        low: candle.low_price,
        close: candle.trade_price,
        volume: candle.candle_acc_trade_volume,
      }));
    } catch (error: any) {
      logger.error("Upbit candles API error:", error.message);
      throw new Error("Failed to fetch chart data from Upbit");
    }
  }

  /**
   * 분봉 차트 데이터 조회
   */
  async getMinuteCandles(
    symbol: string,
    unit: 1 | 3 | 5 | 15 | 30 | 60 | 240,
    count: number = 200
  ) {
    try {
      const market = `KRW-${symbol.toUpperCase()}`;
      const response = await axios.get(
        `${UPBIT_API_URL}/candles/minutes/${unit}`,
        { params: { market, count } }
      );

      return response.data.map((candle: any) => ({
        timestamp: candle.candle_date_time_kst,
        open: candle.opening_price,
        high: candle.high_price,
        low: candle.low_price,
        close: candle.trade_price,
        volume: candle.candle_acc_trade_volume,
      }));
    } catch (error: any) {
      logger.error("Upbit minute candles API error:", error.message);
      throw new Error("Failed to fetch minute chart data from Upbit");
    }
  }

  /**
   * 마켓 코드 조회
   */
  async getAllMarkets() {
    try {
      const response = await axios.get(`${UPBIT_API_URL}/market/all`);
      return response.data.filter((m: any) => m.market.startsWith("KRW-"));
    } catch (error: any) {
      logger.error("Upbit markets API error:", error.message);
      throw new Error("Failed to fetch markets from Upbit");
    }
  }

  /**
   * 원화 마켓 전체 조회
   */
  async getAllKRWMarkets() {
    try {
      const response = await axios.get(`${UPBIT_API_URL}/market/all`);
      const krwMarkets = response.data.filter((m: any) =>
        m.market.startsWith("KRW-")
      );

      return krwMarkets.map((m: any) => ({
        market: m.market,
        symbol: m.market.replace("KRW-", ""),
        koreanName: m.korean_name,
        englishName: m.english_name,
      }));
    } catch (error: any) {
      logger.error("Upbit markets API error:", error.message);
      throw new Error("Failed to fetch markets from Upbit");
    }
  }

  /**
   * 여러 코인의 현재가 한번에 조회
   */
  async getCurrentPrices(symbols: string[]) {
    try {
      const markets = symbols.map((s) => `KRW-${s.toUpperCase()}`).join(",");
      const response = await axios.get(`${UPBIT_API_URL}/ticker`, {
        params: { markets },
      });

      return response.data.map((ticker: any) => ({
        symbol: ticker.market.replace("KRW-", ""),
        market: ticker.market,
        currentPrice: ticker.trade_price,
        change24h: ticker.signed_change_rate * 100,
        high24h: ticker.high_price,
        low24h: ticker.low_price,
        volume24h: ticker.acc_trade_volume_24h,
        tradeValue24h: ticker.acc_trade_price_24h,
        timestamp: new Date(ticker.timestamp),
      }));
    } catch (error: any) {
      logger.error("Upbit ticker API error:", error.message);
      throw new Error("Failed to fetch prices from Upbit");
    }
  }

  /**
   * 🔥 NEW: 기간별 일수 계산 헬퍼 메서드
   */
  private getPeriodDays(period: string): number {
    const periodMap: Record<string, number> = {
      "1d": 1,
      "7d": 7,
      "1m": 30,
      "3m": 90,
      "6m": 180,
      "1y": 365,
    };
    return periodMap[period] || 30;
  }

  /**
   * 🔥 NEW: 여러 심볼의 캔들 데이터 배치 조회 (성능 최적화)
   * 기존: 100개 심볼 = 100번 API 호출 (순차)
   * 개선: 10개씩 묶어서 병렬 처리 = 10번 호출
   */
  async getBatchCandles(symbols: string[], period: string) {
    const days = this.getPeriodDays(period);
    const BATCH_SIZE = 10; // 동시 실행 제한 (Upbit API 제한 고려)
    const results: Record<string, any[]> = {};

    try {
      logger.info(
        `Starting batch candle fetch for ${symbols.length} symbols, period: ${period}`
      );

      // 심볼을 배치 단위로 나누어 처리
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);

        // 현재 배치를 병렬로 처리
        const promises = batch.map((symbol) =>
          this.getDailyCandles(symbol, days + 1)
            .then((data) => ({ symbol, data, success: true }))
            .catch((error) => {
              logger.warn(
                `Failed to fetch candles for ${symbol}:`,
                error.message
              );
              return { symbol, data: [], success: false };
            })
        );

        // 배치 결과 수집
        const batchResults = await Promise.all(promises);

        // 결과 저장
        batchResults.forEach(({ symbol, data }) => {
          results[symbol] = data;
        });

        // API 레이트 리밋 방지를 위한 짧은 대기 (마지막 배치 제외)
        if (i + BATCH_SIZE < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // 진행 상황 로깅
        const processed = Math.min(i + BATCH_SIZE, symbols.length);
        logger.debug(`Processed ${processed}/${symbols.length} symbols`);
      }

      logger.info(
        `Batch candles fetched successfully for ${
          Object.keys(results).length
        } symbols`
      );
      return results;
    } catch (error: any) {
      logger.error("Batch candles fetch error:", error.message);
      // 부분 실패해도 가져온 데이터는 반환
      return results;
    }
  }

  /**
   * 🔥 NEW: 캔들 데이터 캐싱 (메모리 캐시)
   * 동일한 요청이 1분 이내에 오면 캐시된 데이터 반환
   */
  private candleCache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 60 * 1000; // 1분

  async getCachedDailyCandles(symbol: string, count: number = 30) {
    const cacheKey = `${symbol}-${count}`;
    const cached = this.candleCache.get(cacheKey);

    // 캐시가 유효하면 반환
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.debug(`Cache hit for ${symbol} candles`);
      return cached.data;
    }

    // 새로 조회
    const data = await this.getDailyCandles(symbol, count);

    // 캐시 저장
    this.candleCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // 오래된 캐시 정리
    this.cleanupCache();

    return data;
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.candleCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL * 2) {
        this.candleCache.delete(key);
      }
    }
  }
}
