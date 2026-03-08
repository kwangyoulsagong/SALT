import cron from "node-cron";
import prisma from "../config/database";
import { Prisma } from "@prisma/client";

type PlaybookWithRules = Prisma.InvestmentPlaybookGetPayload<{
  include: { rules: true };
}>;

export class PlaybookEngineWorker {
  private running = false;

  start() {
    console.log("🚀 Playbook Engine Worker started");

    this.run();

    cron.schedule("*/5 * * * *", () => {
      this.run();
    });
  }

  private async run() {
    if (this.running) {
      console.log("⚠️ Playbook worker already running");
      return;
    }

    this.running = true;

    console.log("📊 Playbook Engine scanning...");

    try {
      const playbooks = await prisma.investmentPlaybook.findMany({
        where: { isActive: true },
        include: {
          rules: {
            where: { isEnabled: true },
          },
        },
      });

      const BATCH = 20;

      for (let i = 0; i < playbooks.length; i += BATCH) {
        const batch = playbooks.slice(i, i + BATCH);

        await Promise.all(
          batch.map(async (pb) => {
            try {
              await this.runPlaybook(pb);
            } catch (err) {
              console.error("playbook error", pb.id, err);
            }
          }),
        );
      }
    } catch (error) {
      console.error("Playbook Engine Worker error:", error);
    } finally {
      this.running = false;
    }
  }

  private async runPlaybook(pb: PlaybookWithRules) {
    for (const rule of pb.rules) {
      await this.runRule(pb, rule);
    }
  }

  private async runRule(pb: PlaybookWithRules, rule: any) {
    switch (rule.type) {
      case "sentiment_filter":
        return this.evalSentimentRule(pb.userId, pb.id, rule);

      case "whale_filter":
        return this.evalWhaleRule(pb.userId, pb.id, rule);

      case "rebalance":
        return this.evalRebalanceRule(pb.userId, pb, rule);

      default:
        return;
    }
  }

  /**
   * Trigger 생성
   */
  private async emitTrigger(opts: {
    userId: string;
    playbookId: string;
    ruleId: string;
    symbol?: string | null;
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
        symbol: opts.symbol ?? undefined,
        createdAt: { gt: since },
        status: "open",
      },
    });

    if (exists) return;

    const trigger = await prisma.playbookTrigger.create({
      data: {
        userId: opts.userId,
        playbookId: opts.playbookId,
        ruleId: opts.ruleId,
        symbol: opts.symbol ?? undefined,
        title: opts.title,
        message: opts.message,
        severity: opts.severity ?? 50,
        payload: opts.payload,
      },
    });

    await prisma.investmentNotification.create({
      data: {
        userId: opts.userId,
        symbol: opts.symbol ?? undefined,
        source: "playbook",
        type: "trigger",
        title: opts.title,
        message: opts.message,
        severity: opts.severity ?? 50,
        payload: {
          triggerId: trigger.id,
          ...(opts.payload ?? {}),
        },
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
    });
  }

  /**
   * Sentiment Rule
   */
  private async evalSentimentRule(
    userId: string,
    playbookId: string,
    rule: any,
  ) {
    const symbol = rule.symbol;

    if (!symbol) return;

    const latest = await prisma.marketSentiment.findFirst({
      where: { symbol },
      orderBy: { calculatedAt: "desc" },
    });

    if (!latest) return;

    const fearGreed = latest.fearGreedIndex ?? 50;
    const threshold = rule.params?.fearGreedBelow ?? 30;

    if (fearGreed <= threshold) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId: rule.id,
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
  private async evalWhaleRule(userId: string, playbookId: string, rule: any) {
    const symbol = rule.symbol;

    if (!symbol) return;

    const minAmountKRW = rule.params?.minAmountKRW ?? 500000000;

    const since = new Date(Date.now() - 30 * 60 * 1000);

    const whale = await prisma.whaleTransaction.findFirst({
      where: {
        symbol,
        amountKRW: { gte: minAmountKRW },
        detectedAt: { gt: since },
      },
      orderBy: { detectedAt: "desc" },
    });

    if (!whale) return;

    await this.emitTrigger({
      userId,
      playbookId,
      ruleId: rule.id,
      symbol,
      title: "Whale Activity",
      message: `${symbol} 고래 거래 감지 (₩${Math.round(
        whale.amountKRW,
      ).toLocaleString()})`,
      severity: 70,
      payload: whale,
    });
  }

  /**
   * Rebalance Rule
   */
  private async evalRebalanceRule(userId: string, playbook: any, rule: any) {
    const band = rule.params?.band ?? 0.1;

    const holdings = await prisma.portfolioHolding.findMany({
      where: { userId },
    });

    if (!holdings.length) return;

    const total = holdings.reduce((sum, h) => sum + (h.currentValue ?? 0), 0);

    const allocation = playbook.targetAllocation as Record<string, number>;

    if (!allocation) return;

    for (const h of holdings) {
      const target = allocation[h.symbol];

      if (!target) continue;

      const weight = (h.currentValue ?? 0) / total;

      if (Math.abs(weight - target) >= band) {
        await this.emitTrigger({
          userId,
          playbookId: playbook.id,
          ruleId: rule.id,
          symbol: h.symbol,
          title: "Rebalance Needed",
          message: `${h.symbol} 현재 ${(weight * 100).toFixed(
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
