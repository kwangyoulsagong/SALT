"use strict";
// market-price-updater.worker.ts
// Worker가 주기적으로 DB의 마켓 가격을 업데이트
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketPriceUpdater = void 0;
const investment_service_1 = require("../modules/investment/investment.service");
const logger_1 = require("../config/logger");
class MarketPriceUpdater {
    investmentService = new investment_service_1.InvestmentService();
    updateInterval = null;
    isUpdating = false;
    /**
     * Worker 시작
     */
    start() {
        logger_1.logger.info("🚀 Market Price Updater Worker started");
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
        logger_1.logger.info("🛑 Market Price Updater Worker stopped");
    }
    /**
     * 가격 업데이트 실행
     */
    async updatePrices() {
        if (this.isUpdating) {
            logger_1.logger.debug("Previous update still running, skipping...");
            return;
        }
        this.isUpdating = true;
        const startTime = Date.now();
        try {
            logger_1.logger.debug("Starting market price update...");
            const result = await this.investmentService.updateAllMarketPrices();
            const duration = Date.now() - startTime;
            logger_1.logger.info(`✅ Market prices updated: ${result.updated} symbols in ${duration}ms`);
        }
        catch (error) {
            logger_1.logger.error("Market price update failed:", error);
        }
        finally {
            this.isUpdating = false;
        }
    }
}
exports.marketPriceUpdater = new MarketPriceUpdater();
// 프로세스 종료 시 정리
process.on("SIGINT", () => {
    exports.marketPriceUpdater.stop();
    process.exit(0);
});
process.on("SIGTERM", () => {
    exports.marketPriceUpdater.stop();
    process.exit(0);
});
//# sourceMappingURL=market-price-updater.worker.js.map