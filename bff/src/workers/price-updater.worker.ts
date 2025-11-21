import { upbitWSService } from "../services/upbit-ws.service";
import { backendApi } from "../services/backend-api.service";
import { connectionManager } from "../websocket/managers/connection.manager";
import { logger } from "../config/logger";

class PriceUpdaterWorker {
  private updateInterval: NodeJS.Timeout | null = null;
  private subscriptionCheckInterval: NodeJS.Timeout | null = null;

  async start() {
    logger.info("🔄 Price Updater Worker started");

    // 1. 초기 심볼 구독
    await this.updateSubscriptions();

    // 2. 10초마다 구독 심볼 업데이트
    this.subscriptionCheckInterval = setInterval(() => {
      this.updateSubscriptions();
    }, 10000);

    // 3. 5초마다 DB에 가격 업데이트
    this.updateInterval = setInterval(() => {
      this.updateDatabase();
    }, 5000);

    logger.info("✅ Price Updater Worker running");
  }

  /**
   * 구독 심볼 업데이트
   */
  public async updateSubscriptions() {
    try {
      // 1) 화면(프론트)에서 실시간 구독 중인 심볼
      const clientSymbols = connectionManager.getAllSubscribedSymbols();

      // 2) 로그인 유저 관심종목 (optional)
      const watchlistSymbols = await backendApi.getWatchlistSymbols();

      // 3) 💥 Market 전체 목록 (로그인 불필요)
      const marketSymbols = await backendApi.getMarketSymbols();

      // 4) 합집합 (중복 제거)
      const allSymbols = Array.from(
        new Set([...clientSymbols, ...watchlistSymbols, ...marketSymbols])
      );

      if (allSymbols.length === 0) {
        logger.debug("No symbols to subscribe");
        return;
      }

      // 5) 이미 구독 중인 것 제외하고 새로운 것만 Upbit subscribe
      const currentlySubscribed = upbitWSService.getSubscribedSymbols();
      const newSymbols = allSymbols.filter(
        (s) => !currentlySubscribed.includes(s)
      );

      if (newSymbols.length > 0) {
        upbitWSService.subscribe(newSymbols);
        logger.info(`Added ${newSymbols.length} new symbols to subscription`);
      }
    } catch (error) {
      logger.error("Failed to update subscriptions:", error);
    }
  }

  /**
   * DB에 가격 업데이트
   */
  private async updateDatabase() {
    try {
      const priceCache = upbitWSService.getPriceCache();

      if (priceCache.size === 0) {
        return;
      }

      // 캐시에서 가격 데이터 추출
      const priceData = Array.from(priceCache.values()).map((data) => ({
        symbol: data.symbol,
        currentPrice: data.currentPrice,
        priceChange24h: data.change24h,
      }));

      // Backend에 전송
      await backendApi.updateWatchlistPrices(priceData);

      logger.debug(`Updated ${priceData.length} prices in database`);
    } catch (error) {
      logger.error("Failed to update database:", error);
    }
  }

  /**
   * Worker 중지
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.subscriptionCheckInterval) {
      clearInterval(this.subscriptionCheckInterval);
    }
    upbitWSService.close();
    logger.info("Price Updater Worker stopped");
  }
}

const worker = new PriceUpdaterWorker();

// 시작
worker.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM: Stopping worker");
  worker.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT: Stopping worker");
  worker.stop();
  process.exit(0);
});
export { worker };
