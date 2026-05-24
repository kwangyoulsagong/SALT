import cron from "node-cron";
import prisma from "../config/database";
import { TechnicalIndicatorService } from "../modules/technical-indicator/technical-indicator.service";
import { Timeframe } from "@prisma/client";

export class TechnicalIndicatorWorker {
  private indicatorService = new TechnicalIndicatorService();
  private running = false;

  start() {
    console.log("📊 Technical Indicator Worker started");

    // 서버 시작 시 1회 실행
    this.run();

    // 2분마다 실행
    cron.schedule("*/2 * * * *", () => {
      this.run();
    });
  }

  private async run() {
    if (this.running) {
      console.log("⚠️ Indicator worker already running");
      return;
    }

    this.running = true;

    console.log("📊 Calculating technical indicators...");

    try {
      /**
       * 활성 자산 조회
       */
      const assets = await prisma.marketAsset.findMany({
        where: {
          isActive: true,
        },
        select: {
          symbol: true,
          assetType: true,
        },
      });

      if (!assets.length) {
        console.log("No assets found");
        return;
      }

      const BATCH = 20;

      for (let i = 0; i < assets.length; i += BATCH) {
        const batch = assets.slice(i, i + BATCH);

        await Promise.all(
          batch.map(async (asset) => {
            try {
              /**
               * 여러 timeframe 계산
               */
              await this.indicatorService.calculateIndicators(
                asset.symbol,
                Timeframe.m5,
              );

              await this.indicatorService.calculateIndicators(
                asset.symbol,
                Timeframe.h1,
              );
            } catch (err) {
              console.error(`Indicator error for ${asset.symbol}`, err);
            }
          }),
        );
      }

      console.log("✅ Technical indicators updated");
    } catch (error) {
      console.error("❌ TechnicalIndicatorWorker error:", error);
    } finally {
      this.running = false;
    }
  }
}
