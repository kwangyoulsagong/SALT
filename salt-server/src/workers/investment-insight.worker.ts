import cron from "node-cron";
import { InvestmentInsightService } from "../modules/investment-insight/investment-insight.service";
import { WhaleSignalService } from "../modules/investment-insight/whale-signal.service";
import { PortfolioRebalanceService } from "../modules/investment-insight/portfolio-rebalance.service";
import prisma from "../config/database";

export class InvestmentInsightWorker {
  private insightService = new InvestmentInsightService();
  private whaleService = new WhaleSignalService();
  private portfolioRebalanceService = new PortfolioRebalanceService();

  private running = false;

  start() {
    console.log("🚀 Investment Insight Worker started");

    // 서버 시작 시 바로 실행
    this.run();

    // 10분마다 실행
    cron.schedule("*/10 * * * *", () => {
      this.run();
    });
  }

  private async run() {
    if (this.running) return;

    this.running = true;

    try {
      console.log("📊 Generating Smart Buy Zones...");
      await this.insightService.generateSmartBuyZone();

      console.log("🐋 Generating Whale Signals...");
      await this.whaleService.generateWhaleSignals();

      console.log("⚖️ Generating Rebalance...");
      const users = await prisma.user.findMany({
        select: { id: true },
      });

      for (const user of users) {
        await this.portfolioRebalanceService.generateRebalance(user.id);
      }

      console.log("✅ Investment insights generated");
    } catch (error) {
      console.error("Investment insight worker error:", error);
    } finally {
      this.running = false;
    }
  }
}
