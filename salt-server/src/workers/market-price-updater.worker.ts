// market-price-updater.worker.ts
// Worker가 주기적으로 DB의 마켓 가격을 업데이트

import { InvestmentService } from "../modules/investment/investment.service";
import { logger } from "../config/logger";

class MarketPriceUpdater {
  private investmentService = new InvestmentService();
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;

  /**
   * Worker 시작
   */
  start() {
    logger.info("🚀 Market Price Updater Worker started");

    // 즉시 한번 실행
    this.updatePrices();

    // 1분마다 실행
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, 60 * 1000); // 1분
  }

  /**
   * Worker 중지
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    logger.info("🛑 Market Price Updater Worker stopped");
  }

  /**
   * 가격 업데이트 실행
   */
  private async updatePrices() {
    if (this.isUpdating) {
      logger.debug("Previous update still running, skipping...");
      return;
    }

    this.isUpdating = true;
    const startTime = Date.now();

    try {
      logger.debug("Starting market price update...");

      const result = await this.investmentService.updateAllMarketPrices();

      const duration = Date.now() - startTime;
      logger.info(
        `✅ Market prices updated: ${result.updated} symbols in ${duration}ms`
      );
    } catch (error) {
      logger.error("Market price update failed:", error);
    } finally {
      this.isUpdating = false;
    }
  }
}

export const marketPriceUpdater = new MarketPriceUpdater();

// 프로세스 종료 시 정리
process.on("SIGINT", () => {
  marketPriceUpdater.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  marketPriceUpdater.stop();
  process.exit(0);
});
