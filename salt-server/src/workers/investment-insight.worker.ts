import cron from "node-cron";
import prisma from "../config/database";

import { InvestmentInsightService } from "../modules/investment-insight/investment-insight.service";
import { WhaleSignalService } from "../modules/investment-insight/whale-signal.service";
import { PortfolioRebalanceService } from "../modules/investment-insight/portfolio-rebalance.service";
import { BehaviorAnalysisService } from "../modules/investment-insight/behavior-analysis.service";
import { RiskAlertService } from "../modules/investment-insight/risk-alert.service";
import { AIInvestmentCoachService } from "../modules/investment-insight/ai-investment-coach.service";
import { NewsAnalysisService } from "./../modules/investment-insight/news-analysis.service";

export class InvestmentInsightWorker {
  private insightService = new InvestmentInsightService();
  private whaleService = new WhaleSignalService();
  private portfolioRebalanceService = new PortfolioRebalanceService();
  private behaviorService = new BehaviorAnalysisService();
  private riskService = new RiskAlertService();
  private aiCoachService = new AIInvestmentCoachService();
  private newsAnalysisService = new NewsAnalysisService();

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
      await this.newsAnalysisService.analyzeAll();

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
          this.behaviorService.generateBehaviorAnalysis(user.id),
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
        users.map((user) => this.aiCoachService.generateCoach(user.id)),
      );

      console.log("✅ Investment insights generated successfully");
    } catch (error) {
      console.error("❌ Investment insight worker error:", error);
    } finally {
      this.running = false;
    }
  }
}
