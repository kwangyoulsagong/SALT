// workers/playbook-engine.worker.ts

import cron from "node-cron";
import prisma from "../config/database";

export class PlaybookEngineWorker {
  private running = false;

  start() {
    console.log("🚀 Playbook Engine Worker started");

    // 서버 시작 시 1회 실행
    this.run();

    // 5분마다 실행
    cron.schedule("*/5 * * * *", () => {
      this.run();
    });
  }

  private async run() {
    if (this.running) return;
    this.running = true;

    try {
      const playbooks = await prisma.investmentPlaybook.findMany({
        where: { isActive: true },
        include: {
          rules: {
            where: { isEnabled: true },
          },
        },
      });

      for (const pb of playbooks) {
        for (const rule of pb.rules) {
          switch (rule.type) {
            case "sentiment_filter":
              await this.evalSentimentRule(
                pb.userId,
                pb.id,
                rule.id,
                rule.symbol ?? null,
                rule.params,
              );
              break;

            case "whale_filter":
              await this.evalWhaleRule(
                pb.userId,
                pb.id,
                rule.id,
                rule.symbol ?? null,
                rule.params,
              );
              break;

            case "rebalance":
              await this.evalRebalanceRule(
                pb.userId,
                pb,
                rule.id,
                rule.symbol ?? null,
                rule.params,
              );
              break;

            default:
              break;
          }
        }
      }
    } catch (error) {
      console.error("Playbook Engine Worker error:", error);
    } finally {
      this.running = false;
    }
  }

  /**
   * Trigger 생성 (중복 방지 포함)
   */
  private async emitTrigger(opts: {
    userId: string;
    playbookId: string;
    ruleId: string;
    symbol: string | null;
    title: string;
    message: string;
    severity?: number;
    payload?: any;
  }) {
    const cooldownMinutes = 10;
    const since = new Date(Date.now() - cooldownMinutes * 60 * 1000);

    const exists = await prisma.playbookTrigger.findFirst({
      where: {
        userId: opts.userId,
        ruleId: opts.ruleId,
        ...(opts.symbol ? { symbol: opts.symbol } : {}),
        createdAt: { gt: since },
        status: "open",
      },
    });

    if (exists) return;

    await prisma.playbookTrigger.create({
      data: {
        userId: opts.userId,
        playbookId: opts.playbookId,
        ruleId: opts.ruleId,
        ...(opts.symbol ? { symbol: opts.symbol } : {}),
        title: opts.title,
        message: opts.message,
        severity: opts.severity ?? 50,
        payload: opts.payload,
      },
    });
  }

  /**
   * Sentiment Rule
   */
  private async evalSentimentRule(
    userId: string,
    playbookId: string,
    ruleId: string,
    symbol: string | null,
    params: any,
  ) {
    if (!symbol) return;

    const latest = await prisma.marketSentiment.findFirst({
      where: { symbol },
      orderBy: { calculatedAt: "desc" },
    });

    if (!latest) return;

    const fearGreed = latest.fearGreedIndex ?? 50;
    const threshold = params?.fearGreedBelow ?? 30;

    if (fearGreed <= threshold) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId,
        symbol,
        title: "Sentiment Alert",
        message: `${symbol} 공포지수(${fearGreed})가 기준(${threshold}) 이하입니다.`,
        severity: 60,
        payload: { fearGreed, threshold },
      });
    }
  }

  /**
   * Whale Rule
   */
  private async evalWhaleRule(
    userId: string,
    playbookId: string,
    ruleId: string,
    symbol: string | null,
    params: any,
  ) {
    if (!symbol) return;

    const minAmountKRW = params?.minAmountKRW ?? 500000000;

    const since = new Date(Date.now() - 30 * 60 * 1000);

    const whale = await prisma.whaleTransaction.findFirst({
      where: {
        symbol,
        amountKRW: { gte: minAmountKRW },
        detectedAt: { gt: since },
      },
      orderBy: { detectedAt: "desc" },
    });

    if (whale) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId,
        symbol,
        title: "Whale Activity",
        message: `${symbol} 고래 거래 감지 (₩${Math.round(
          whale.amountKRW,
        ).toLocaleString()})`,
        severity: 70,
        payload: whale,
      });
    }
  }

  /**
   * Rebalance Rule
   */
  private async evalRebalanceRule(
    userId: string,
    playbook: any,
    ruleId: string,
    symbol: string | null,
    params: any,
  ) {
    const band = params?.band ?? 0.1;

    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
    });

    if (holdings.length === 0) return;

    const total = holdings.reduce((sum, h) => sum + (h.currentValue ?? 0), 0);

    if (total <= 0) return;

    const allocation = playbook.targetAllocation as any;

    if (!allocation) return;

    for (const h of holdings) {
      const target = allocation?.[h.symbol];

      if (typeof target !== "number") continue;

      const weight = (h.currentValue ?? 0) / total;

      if (Math.abs(weight - target) >= band) {
        await this.emitTrigger({
          userId,
          playbookId: playbook.id,
          ruleId,
          symbol: h.symbol,
          title: "Rebalance Needed",
          message: `${h.symbol} 현재비중 ${(weight * 100).toFixed(
            1,
          )}% / 목표 ${(target * 100).toFixed(1)}%`,
          severity: 55,
          payload: {
            currentWeight: weight,
            targetWeight: target,
            band,
          },
        });
      }
    }
  }
}
