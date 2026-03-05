import cron from "node-cron";
import { InvestmentInsightService } from "../modules/investment-insight/investment-insight.service";
import { WhaleSignalService } from "../modules/investment-insight/whale-signal.service";
import { PortfolioRebalanceService } from "../modules/investment-insight/portfolio-rebalance.service";
import prisma from "../config/database";
import { BehaviorAnalysisService } from "../modules/investment-insight/behavior-analysis.service";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class InvestmentInsightWorker {
  private insightService = new InvestmentInsightService();
  private whaleService = new WhaleSignalService();
  private portfolioRebalanceService = new PortfolioRebalanceService();
  private behaviorAnalysisService = new BehaviorAnalysisService();

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

    const start = Date.now();

    try {
      console.log("📊 Generating Smart Buy Zones...");
      await this.insightService.generateSmartBuyZone();

      console.log("🐋 Generating Whale Signals...");
      await this.whaleService.generateWhaleSignals();

      const users = await prisma.user.findMany({
        select: { id: true },
      });

      console.log(`👤 Processing ${users.length} users`);

      const BATCH = 20;

      console.log("⚖️ Generating Rebalance...");

      for (let i = 0; i < users.length; i += BATCH) {
        const batch = users.slice(i, i + BATCH);

        await Promise.allSettled(
          batch.map((u) =>
            this.portfolioRebalanceService.generateRebalance(u.id),
          ),
        );

        await sleep(100);
      }

      for (const user of users) {
        await this.portfolioRebalanceService.generateRebalance(user.id);
      }

      console.log("🧠 Generating Behavior Analysis...");

      for (let i = 0; i < users.length; i += BATCH) {
        const batch = users.slice(i, i + BATCH);

        const results = await Promise.allSettled(
          batch.map((u) =>
            this.behaviorAnalysisService.generateBehaviorAnalysis(u.id),
          ),
        );

        // (선택) 실패 로깅
        results.forEach((r, idx) => {
          if (r.status === "rejected") {
            console.error("Behavior analysis failed:", batch[idx].id, r.reason);
          }
        });

        await sleep(100);
      }

      console.log(
        `✅ Investment insights generated in ${Date.now() - start}ms`,
      );
    } catch (error) {
      console.error("Investment insight worker error:", error);
    } finally {
      this.running = false;
    }
  }
}
