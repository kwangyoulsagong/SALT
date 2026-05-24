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
      case "buy_zone_entry":
        return this.evalBuyZoneRule(pb.userId, pb.id, rule);

      case "stop_loss":
        return this.evalStopLossRule(pb.userId, pb.id, rule);

      case "take_profit":
        return this.evalTakeProfitRule(pb.userId, pb.id, rule);

      case "sentiment_filter":
        return this.evalSentimentRule(pb.userId, pb.id, rule);

      case "whale_filter":
        return this.evalWhaleRule(pb.userId, pb.id, rule);

      case "rebalance":
        return this.evalRebalanceRule(pb.userId, pb, rule);

      case "rsi_oversold":
        return this.evalRSIOversoldRule(pb.userId, pb.id, rule);

      case "rsi_overbought":
        return this.evalRSIOverboughtRule(pb.userId, pb.id, rule);

      case "ma_cross":
        return this.evalMACrossRule(pb.userId, pb.id, rule);

      case "volume_spike":
        return this.evalVolumeSpikeRule(pb.userId, pb.id, rule);

      default:
        return;
    }
  }

  /**
   * Trigger 생성 + Notification 생성
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
   * Smart Buy Zone Rule
   */
  private async evalBuyZoneRule(userId: string, playbookId: string, rule: any) {
    const symbol = rule.symbol;

    if (!symbol) return;

    const insight = await prisma.investmentInsight.findFirst({
      where: {
        userId: "global",
        symbol,
        type: "smart_buy_zone",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!insight) return;

    await this.emitTrigger({
      userId,
      playbookId,
      ruleId: rule.id,
      symbol,
      title: "Smart Buy Zone",
      message: `${symbol} 매수 구간 진입`,
      severity: 65,
      payload: insight.payload,
    });
  }

  /**
   * Stop Loss Rule
   */
  private async evalStopLossRule(
    userId: string,
    playbookId: string,
    rule: any,
  ) {
    const symbol = rule.symbol;

    if (!symbol) return;

    const threshold = rule.params?.lossRate ?? 0.1;

    const holding = await prisma.portfolioHolding.findFirst({
      where: { userId, symbol },
    });

    if (!holding) return;

    const lossRate = Math.abs(holding.unrealizedProfitRate ?? 0);

    if (lossRate >= threshold) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId: rule.id,
        symbol,
        title: "Stop Loss Trigger",
        message: `${symbol} 손실 ${(lossRate * 100).toFixed(1)}%`,
        severity: 80,
        payload: { lossRate },
      });
    }
  }

  /**
   * Take Profit Rule
   */
  private async evalTakeProfitRule(
    userId: string,
    playbookId: string,
    rule: any,
  ) {
    const symbol = rule.symbol;

    if (!symbol) return;

    const threshold = rule.params?.profitRate ?? 0.2;

    const holding = await prisma.portfolioHolding.findFirst({
      where: { userId, symbol },
    });

    if (!holding) return;

    const profitRate = holding.unrealizedProfitRate ?? 0;

    if (profitRate >= threshold) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId: rule.id,
        symbol,
        title: "Take Profit Trigger",
        message: `${symbol} 수익 ${(profitRate * 100).toFixed(1)}%`,
        severity: 70,
        payload: { profitRate },
      });
    }
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

  private async evalRSIOversoldRule(
    userId: string,
    playbookId: string,
    rule: any,
  ) {
    const symbol = rule.symbol;
    if (!symbol) return;

    const threshold = rule.params?.rsiBelow ?? 30;

    const indicator = await prisma.technicalIndicator.findFirst({
      where: { symbol },
      orderBy: { timestamp: "desc" },
    });

    if (!indicator?.rsi14) return;

    if (indicator.rsi14 <= threshold) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId: rule.id,
        symbol,
        title: "RSI Oversold",
        message: `${symbol} RSI ${indicator.rsi14.toFixed(1)} 과매도 구간`,
        severity: 65,
        payload: { rsi: indicator.rsi14 },
      });
    }
  }

  private async evalRSIOverboughtRule(
    userId: string,
    playbookId: string,
    rule: any,
  ) {
    const symbol = rule.symbol;
    if (!symbol) return;

    const threshold = rule.params?.rsiAbove ?? 70;

    const indicator = await prisma.technicalIndicator.findFirst({
      where: { symbol },
      orderBy: { timestamp: "desc" },
    });

    if (!indicator?.rsi14) return;

    if (indicator.rsi14 >= threshold) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId: rule.id,
        symbol,
        title: "RSI Overbought",
        message: `${symbol} RSI ${indicator.rsi14.toFixed(1)} 과열 구간`,
        severity: 70,
        payload: { rsi: indicator.rsi14 },
      });
    }
  }

  private async evalMACrossRule(userId: string, playbookId: string, rule: any) {
    const symbol = rule.symbol;
    if (!symbol) return;

    const indicator = await prisma.technicalIndicator.findFirst({
      where: { symbol },
      orderBy: { timestamp: "desc" },
    });

    if (!indicator?.ma20 || !indicator?.ma50) return;

    if (indicator.ma20 > indicator.ma50) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId: rule.id,
        symbol,
        title: "Golden Cross",
        message: `${symbol} MA20 > MA50 상승 추세`,
        severity: 60,
        payload: {
          ma20: indicator.ma20,
          ma50: indicator.ma50,
        },
      });
    }
  }

  private async evalVolumeSpikeRule(
    userId: string,
    playbookId: string,
    rule: any,
  ) {
    const symbol = rule.symbol;
    if (!symbol) return;

    const threshold = rule.params?.volumeMultiplier ?? 2;

    const indicator = await prisma.technicalIndicator.findFirst({
      where: { symbol },
      orderBy: { timestamp: "desc" },
    });

    if (!indicator?.volumeAvg20) return;

    const latestCandle = await prisma.priceHistory.findFirst({
      where: { symbol },
      orderBy: { timestamp: "desc" },
    });

    if (!latestCandle?.volume) return;

    const ratio = Number(latestCandle.volume) / indicator.volumeAvg20;

    if (ratio >= threshold) {
      await this.emitTrigger({
        userId,
        playbookId,
        ruleId: rule.id,
        symbol,
        title: "Volume Spike",
        message: `${symbol} 거래량 급증 (${ratio.toFixed(1)}x)`,
        severity: 60,
        payload: { volumeRatio: ratio },
      });
    }
  }
}
