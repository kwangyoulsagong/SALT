import cron from "node-cron";
import prisma from "../shared/infrastructure/prisma";

import { InvestmentInsightService } from "../modules/investment-insight/investment-insight.service";
import { WhaleSignalService } from "../modules/investment-insight/whale-signal.service";
import { PortfolioRebalanceService } from "../modules/investment-insight/portfolio-rebalance.service";
import { RiskAlertService } from "../modules/investment-insight/risk-alert.service";

// 이관된 컨텍스트의 유스케이스는 조립 지점에서 온다 (`composition.ts`).
// 워커는 **스케줄과 락만** 갖고 절차는 유스케이스에 있다 (`server-architecture.md` §7).
import { contextUseCases } from "../composition";

export class InvestmentInsightWorker {
  private insightService = new InvestmentInsightService();
  private whaleService = new WhaleSignalService();
  private portfolioRebalanceService = new PortfolioRebalanceService();
  private riskService = new RiskAlertService();
  private coach = contextUseCases.coach;

  private running = false;

  start() {
    console.log("🚀 Investment Insight Worker started");

    // 서버 시작 시 1회 실행
    this.run();

    // 10분마다 실행
    cron.schedule("*/10 * * * *", () => {
      this.run();
    });
  }

  private async run() {
    if (this.running) {
      console.log("⚠️ Insight worker already running, skipping...");
      return;
    }

    this.running = true;

    try {
      /**
       * 1️⃣ Smart Buy Zone
       */
      console.log("📊 Generating Smart Buy Zones...");
      await this.insightService.generateSmartBuyZone();

      /**
       * 2️⃣ Whale Signals
       */
      console.log("🐋 Generating Whale Signals...");
      await this.whaleService.generateWhaleSignals();

      console.log("📰 Analyzing news sentiment...");
      await this.coach.analyzeNewsSentiment.execute();

      /**
       * 사용자 목록
       */
      const users = await prisma.user.findMany({
        select: { id: true },
      });

      /**
       * 3️⃣ Portfolio Rebalance
       */
      console.log("⚖️ Generating Rebalance Insights...");

      await Promise.all(
        users.map((user) =>
          this.portfolioRebalanceService.generateRebalance(user.id),
        ),
      );

      /**
       * 4️⃣ Behavior Analysis
       */
      console.log("🧠 Generating Behavior Analysis...");

      await Promise.all(
        users.map((user) =>
          this.coach.analyzeTradingBehavior.execute(user.id),
        ),
      );

      /**
       * 5️⃣ Risk Alerts
       */
      console.log("⚠️ Generating Risk Alerts...");

      await Promise.all(
        users.map((user) => this.riskService.generateRiskAlerts(user.id)),
      );

      /**
       * 6️⃣ AI Coach (마지막)
       */
      console.log("🤖 Generating AI Coach...");

      await Promise.all(
        users.map((user) => this.coach.generateRecommendation.execute(user.id)),
      );

      console.log("✅ Investment insights generated successfully");
    } catch (error) {
      console.error("❌ Investment insight worker error:", error);
    } finally {
      this.running = false;
    }
  }
}
