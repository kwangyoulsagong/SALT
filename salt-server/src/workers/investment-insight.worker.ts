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
  /** 이 회차에서 건너뛴 단계. 부분 성공을 성공으로 적지 않기 위한 것이다. */
  private failures: string[] = [];

  start() {
    console.log("🚀 Investment Insight Worker started");

    // 서버 시작 시 1회 실행
    this.run();

    // 10분마다 실행
    cron.schedule("*/10 * * * *", () => {
      this.run();
    });
  }

  /**
   * 단계 하나. **실패해도 회차를 중단시키지 않는다.**
   *
   * 원문은 여섯 단계를 `try` 하나로 감쌌다. 그래서 2단계(고래 신호)가 던지면
   * 3~6단계가 **한 번도 실행되지 않았다** — 실측으로 확인했다(`SRV-REQ-006` §14).
   * 단계들은 서로 독립이고 각자 upsert 로 멱등하다. 한 단계의 실패가 나머지를
   * 날리는 것은 `workers-external.md`("반복 작업은 실패해도 다음 실행 가능성을
   * 남긴다")가 금지하는 모양이다.
   */
  private async step(label: string, run: () => Promise<unknown>) {
    console.log(label);

    try {
      await run();
    } catch (error) {
      console.error(`❌ ${label} 실패 — 이 단계만 건너뛴다:`, error);
      this.failures.push(label);
    }
  }

  /**
   * 사용자별 작업. **한 사용자의 실패가 다른 사용자를 막지 않는다.**
   *
   * `Promise.all` 은 첫 실패에서 거부되므로 나머지 사용자의 결과가 버려진다.
   */
  private async forEachUser(
    label: string,
    userIds: string[],
    run: (userId: string) => Promise<unknown>
  ) {
    console.log(label);

    const results = await Promise.allSettled(userIds.map(run));
    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length > 0) {
      console.error(
        `❌ ${label} — ${failed.length}/${userIds.length}명 실패:`,
        (failed[0] as PromiseRejectedResult).reason
      );
      this.failures.push(`${label} (${failed.length}명)`);
    }
  }

  private async run() {
    if (this.running) {
      console.log("⚠️ Insight worker already running, skipping...");
      return;
    }

    this.running = true;
    this.failures = [];

    try {
      await this.step("📊 Generating Smart Buy Zones...", () =>
        this.insightService.generateSmartBuyZone()
      );

      await this.step("🐋 Generating Whale Signals...", () =>
        this.whaleService.generateWhaleSignals()
      );

      await this.step("📰 Analyzing news sentiment...", () =>
        this.coach.analyzeNewsSentiment.execute()
      );

      // 종목 판단 스냅샷 (F004 · D11). 10분마다 돌지만 **관찰 기간이 지난 조합만** 쓴다 —
      // 단타는 종목당 하루 1건, 장기는 30일에 1건(B39). 사후 판정도 만기가 된 것만 본다.
      await this.step("🎯 Snapshotting symbol judgments...", async () => {
        const result = await this.coach.snapshotSymbolJudgments.execute();
        console.log(
          `   추적 ${result.tracked} · 기록 ${result.written}` +
            (result.skippedNoPrice.length
              ? ` · 현재가 없음 ${result.skippedNoPrice.join(",")}`
              : "")
        );
      });

      await this.step("🧾 Evaluating matured judgments...", async () => {
        const result = await this.coach.evaluateSymbolJudgments.execute();
        console.log(
          `   판정 ${result.evaluated} · 종가 대기 ${result.waitingForPrice}`
        );
      });

      const users = await prisma.user.findMany({ select: { id: true } });
      const userIds = users.map((user) => user.id);

      await this.forEachUser(
        "⚖️ Generating Rebalance Insights...",
        userIds,
        (userId) => this.portfolioRebalanceService.generateRebalance(userId)
      );

      await this.forEachUser(
        "🧠 Generating Behavior Analysis...",
        userIds,
        (userId) => this.coach.analyzeTradingBehavior.execute(userId)
      );

      await this.forEachUser("⚠️ Generating Risk Alerts...", userIds, (userId) =>
        this.riskService.generateRiskAlerts(userId)
      );

      // 코치는 앞 단계가 만든 인사이트를 읽으므로 마지막이다.
      await this.forEachUser("🤖 Generating AI Coach...", userIds, (userId) =>
        this.coach.generateRecommendation.execute(userId)
      );

      if (this.failures.length === 0) {
        console.log("✅ Investment insights generated successfully");
      } else {
        // **부분 성공을 성공으로 적지 않는다.** 무엇이 빠졌는지 남긴다.
        console.warn(
          `⚠️ Investment insights 부분 완료 — 건너뛴 단계: ${this.failures.join(", ")}`
        );
      }
    } catch (error) {
      // 여기 오는 것은 단계 밖의 실패(사용자 목록 조회)뿐이다.
      console.error("❌ Investment insight worker error:", error);
    } finally {
      this.running = false;
    }
  }
}
