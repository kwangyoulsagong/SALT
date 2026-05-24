import prisma from "../../config/database";
import { AICoachFeatureExtractor } from "./ai-coach/ai-coach-feature.extractor";
import { AICoachCandidateGenerator } from "./ai-coach/ai-coach-candidate.generator";
import { AICoachScoreEngine } from "./ai-coach/ai-coach-score.engine";
import { AICoachExplainer } from "./ai-coach/ai-coach-explainer";
import type {
  CoachMode,
  GenerateCoachDto,
  GetCoachQueryDto,
  UpdateCoachProfileDto,
  CoachFeedbackDto,
} from "./ai-coach/ai-coach.dto";

export class AIInvestmentCoachService {
  private extractor = new AICoachFeatureExtractor();
  private candidateGenerator = new AICoachCandidateGenerator();
  private scoreEngine = new AICoachScoreEngine();
  private explainer = new AICoachExplainer();

  async getCoach(userId: string, query?: GetCoachQueryDto) {
    const coachQuery: Partial<GetCoachQueryDto> = query ?? {};
    if (coachQuery.symbol || coachQuery.mode || coachQuery.preview) {
      return this.buildSymbolCoach(userId, {
        symbol: coachQuery.symbol?.toUpperCase() ?? "BTC",
        mode: coachQuery.mode,
        preview: coachQuery.preview,
      });
    }

    return prisma.investmentInsight.findFirst({
      where: {
        userId,
        type: "ai_coach",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async generateCoach(userId: string, options: GenerateCoachDto = {}) {
    const ctx = await this.extractor.extract(userId);
    if (!ctx) {
      return this.buildSymbolCoach(userId, {
        symbol: options.symbol?.toUpperCase() ?? "BTC",
        mode: options.mode,
      });
    }

    const candidates = this.candidateGenerator.generate(ctx);

    const ranked = candidates
      .map((candidate) => this.scoreEngine.scoreCandidate(ctx, candidate))
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) return null;

    const top = ranked[0];
    const second = ranked[1];

    const { summary, payload } = this.explainer.build(ctx, top, ranked);
    const selectedSymbol = options.symbol?.toUpperCase() ?? top.symbol;
    const selectedMode = options.mode ?? "long_term";
    const symbolCoach = await this.buildSymbolCoach(userId, {
      symbol: selectedSymbol,
      mode: selectedMode,
    });
    const previousCoach = await prisma.investmentInsight.findUnique({
      where: {
        userId_type_dedupeKey: {
          userId,
          type: "ai_coach",
          dedupeKey: "main_coach",
        },
      },
    });
    const extendedPayload = {
      ...payload,
      mode: selectedMode,
      symbol: selectedSymbol,
      decision: symbolCoach.modeDecision,
      dualDecision: symbolCoach.dualDecision,
      missingData: symbolCoach.missingData,
      dataFreshness: symbolCoach.dataFreshness,
      generatedAt: new Date().toISOString(),
    };

    const severity = this.calculateSeverity(
      top.score,
      ctx.portfolioState.riskLevel,
    );
    const confidence = this.calculateConfidence(top.score, second?.score ?? 0);

    const insight = await prisma.investmentInsight.upsert({
      where: {
        userId_type_dedupeKey: {
          userId,
          type: "ai_coach",
          dedupeKey: "main_coach",
        },
      },
      create: {
        userId,
        type: "ai_coach",
        title: "AI 투자 코치",
        summary,
        severity,
        confidence,
        dedupeKey: "main_coach",
        payload: extendedPayload,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      update: {
        summary,
        severity,
        confidence,
        payload: extendedPayload,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    await this.createDecisionChangeNotification({
      userId,
      symbol: selectedSymbol,
      mode: selectedMode,
      previousPayload: previousCoach?.payload as Record<string, any> | null,
      nextPayload: extendedPayload,
    });

    return insight;
  }

  async getProfile(userId: string) {
    const profile = await prisma.userInvestmentProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return {
      ...profile,
      defaultMode: "scalp",
      notificationLevel: "medium",
      supportedModes: ["scalp", "long_term"],
    };
  }

  async updateProfile(userId: string, data: UpdateCoachProfileDto) {
    const profile = await prisma.userInvestmentProfile.upsert({
      where: { userId },
      create: {
        userId,
        riskTolerance: data.riskTolerance ?? "medium",
        maxSingleAssetWeight: data.maxSingleAssetWeight ?? 0.6,
        rebalanceBand: data.rebalanceBand ?? 0.1,
        panicSellWindowHours: data.panicSellWindowHours ?? 24,
      },
      update: {
        ...(data.riskTolerance ? { riskTolerance: data.riskTolerance } : {}),
        ...(data.maxSingleAssetWeight !== undefined
          ? { maxSingleAssetWeight: data.maxSingleAssetWeight }
          : {}),
        ...(data.rebalanceBand !== undefined
          ? { rebalanceBand: data.rebalanceBand }
          : {}),
        ...(data.panicSellWindowHours !== undefined
          ? { panicSellWindowHours: data.panicSellWindowHours }
          : {}),
      },
    });

    return {
      ...profile,
      defaultMode: data.defaultMode ?? "scalp",
      notificationLevel: data.notificationLevel ?? "medium",
      unsupportedPersistedFields: ["defaultMode", "notificationLevel"],
    };
  }

  async recordFeedback(userId: string, data: CoachFeedbackDto) {
    return prisma.investmentInsight.create({
      data: {
        userId,
        symbol: data.symbol.toUpperCase(),
        assetType: "crypto",
        type: "ai_coach",
        title: "AI 코치 피드백",
        summary: `사용자가 ${data.symbol.toUpperCase()} ${data.mode} 코치 판단을 ${data.action} 처리했습니다.`,
        severity: 0,
        confidence: null,
        dedupeKey: `feedback:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        payload: {
          kind: "coach_feedback",
          insightId: data.insightId ?? null,
          symbol: data.symbol.toUpperCase(),
          mode: data.mode,
          action: data.action,
          outcome: data.outcome,
          note: data.note ?? null,
          recordedAt: new Date().toISOString(),
        },
      },
    });
  }

  private async createDecisionChangeNotification(input: {
    userId: string;
    symbol: string;
    mode: CoachMode;
    previousPayload: Record<string, any> | null;
    nextPayload: Record<string, any>;
  }) {
    const previousAction = input.previousPayload?.decision?.action;
    const nextAction = input.nextPayload.decision?.action;

    if (!previousAction || !nextAction || previousAction === nextAction) {
      return null;
    }

    const recentSame = await prisma.investmentNotification.findFirst({
      where: {
        userId: input.userId,
        symbol: input.symbol,
        source: "ai_coach",
        type: "decision_change",
        createdAt: {
          gt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      },
    });

    if (recentSame) return null;

    return prisma.investmentNotification.create({
      data: {
        userId: input.userId,
        symbol: input.symbol,
        source: "ai_coach",
        type: "decision_change",
        title: "AI 코치 판단 변화",
        message: `${input.symbol} ${input.mode} 판단이 ${previousAction}에서 ${nextAction}로 바뀌었습니다.`,
        severity: 70,
        payload: {
          previousAction,
          nextAction,
          mode: input.mode,
          symbol: input.symbol,
          changedAt: new Date().toISOString(),
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  private async buildSymbolCoach(
    userId: string,
    options: { symbol: string; mode?: CoachMode; preview?: boolean },
  ) {
    const symbol = options.symbol.toUpperCase();
    const [asset, holding, sentiment, indicator, whales, profile] =
      await Promise.all([
        prisma.marketAsset.findUnique({ where: { symbol } }),
        prisma.portfolioHolding.findUnique({
          where: {
            userId_symbol_assetType: {
              userId,
              symbol,
              assetType: "crypto",
            },
          },
        }),
        prisma.marketSentiment.findFirst({
          where: { symbol },
          orderBy: { calculatedAt: "desc" },
        }),
        prisma.technicalIndicator.findFirst({
          where: { symbol },
          orderBy: { timestamp: "desc" },
        }),
        prisma.whaleTransaction.findMany({
          where: { symbol },
          orderBy: { detectedAt: "desc" },
          take: 20,
        }),
        prisma.userInvestmentProfile.findUnique({ where: { userId } }),
      ]);

    const missingData: string[] = [];
    if (!asset?.currentPrice) missingData.push("price");
    if (!sentiment) missingData.push("sentiment");
    if (!indicator) missingData.push("technical_indicator");
    if (!whales.length) missingData.push("whale_flow");

    const whaleBuy = whales
      .filter((item) => item.transactionType === "buy")
      .reduce((sum, item) => sum + Number(item.amountKRW ?? 0), 0);
    const whaleSell = whales
      .filter((item) => item.transactionType === "sell")
      .reduce((sum, item) => sum + Number(item.amountKRW ?? 0), 0);

    const scalp = this.makeModeDecision({
      mode: "scalp",
      symbol,
      change24h: Number(asset?.change24h ?? sentiment?.priceChange24h ?? 0),
      sentimentScore: sentiment?.sentimentScore,
      rsi: indicator?.rsi14 ? Number(indicator.rsi14) : undefined,
      whaleBuy,
      whaleSell,
      hasHolding: Boolean(holding),
      missingData,
    });

    const longTerm = this.makeModeDecision({
      mode: "long_term",
      symbol,
      change24h: Number(asset?.change24h ?? sentiment?.priceChange24h ?? 0),
      sentimentScore: sentiment?.sentimentScore,
      rsi: indicator?.rsi14 ? Number(indicator.rsi14) : undefined,
      whaleBuy,
      whaleSell,
      hasHolding: Boolean(holding),
      missingData,
    });

    const selectedMode = options.mode ?? "scalp";
    const modeDecision = selectedMode === "scalp" ? scalp : longTerm;

    return {
      symbol,
      mode: selectedMode,
      preview: Boolean(options.preview),
      headline: modeDecision.headline,
      modeDecision,
      dualDecision: {
        scalp,
        longTerm,
      },
      riskGuard: {
        hasHolding: Boolean(holding),
        holdingWeightLimit: profile?.maxSingleAssetWeight ?? 0.6,
        currentValue: holding?.currentValue ?? 0,
        unrealizedProfitRate: holding?.unrealizedProfitRate ?? null,
      },
      evidence: {
        price: asset?.currentPrice ? Number(asset.currentPrice) : null,
        change24h: asset?.change24h ? Number(asset.change24h) : null,
        sentiment: sentiment
          ? {
              score: sentiment.sentimentScore,
              label: sentiment.sentimentLabel,
              calculatedAt: sentiment.calculatedAt,
            }
          : null,
        technical: indicator
          ? {
              rsi: indicator.rsi14 ? Number(indicator.rsi14) : null,
              timestamp: indicator.timestamp,
            }
          : null,
        whale: {
          buyAmountKRW: whaleBuy,
          sellAmountKRW: whaleSell,
          count: whales.length,
        },
      },
      missingData,
      dataFreshness: {
        priceUpdatedAt: asset?.priceUpdatedAt ?? null,
        sentimentCalculatedAt: sentiment?.calculatedAt ?? null,
        indicatorTimestamp: indicator?.timestamp ?? null,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private makeModeDecision(input: {
    mode: CoachMode;
    symbol: string;
    change24h: number;
    sentimentScore?: number;
    rsi?: number;
    whaleBuy: number;
    whaleSell: number;
    hasHolding: boolean;
    missingData: string[];
  }) {
    let score = 50;
    const reasons: string[] = [];
    const risks: string[] = [];

    if (input.change24h > 3) {
      score += input.mode === "scalp" ? 12 : -6;
      reasons.push("24시간 가격 흐름이 강합니다.");
    }
    if (input.change24h < -3) {
      score += input.mode === "long_term" ? 6 : -10;
      risks.push("단기 변동성이 커졌습니다.");
    }
    if (input.sentimentScore !== undefined && input.sentimentScore >= 70) {
      score += input.mode === "scalp" ? 5 : -8;
      risks.push("시장 심리가 과열권입니다.");
    }
    if (input.sentimentScore !== undefined && input.sentimentScore <= 35) {
      score += input.mode === "long_term" ? 10 : -4;
      reasons.push("공포 구간이라 장기 분할 관찰 가치가 있습니다.");
    }
    if (input.rsi !== undefined && input.rsi >= 70) {
      score -= input.mode === "long_term" ? 12 : 6;
      risks.push("기술 지표가 과열권에 가깝습니다.");
    }
    if (input.rsi !== undefined && input.rsi <= 35) {
      score += input.mode === "long_term" ? 8 : 4;
      reasons.push("단기 침체 신호가 일부 있습니다.");
    }
    if (input.whaleBuy > input.whaleSell * 1.2) {
      score += 8;
      reasons.push("최근 대형 매수 흐름이 매도보다 우세합니다.");
    }
    if (input.whaleSell > input.whaleBuy * 1.2) {
      score -= 8;
      risks.push("최근 대형 매도 흐름이 우세합니다.");
    }
    if (input.missingData.length >= 3) {
      score -= 12;
      risks.push("판단 데이터가 부족합니다.");
    }

    const normalized = Math.max(0, Math.min(100, Math.round(score)));
    const action =
      normalized >= 70
        ? input.mode === "scalp"
          ? "review_short_opportunity"
          : "review_accumulation"
        : normalized >= 50
          ? "wait"
          : "avoid";
    const label =
      action === "review_short_opportunity"
        ? "단타 기회 후보"
        : action === "review_accumulation"
          ? "장기 모아가기 후보"
          : action === "wait"
            ? "관망"
            : "지금은 피하기";

    return {
      mode: input.mode,
      symbol: input.symbol,
      label,
      action,
      confidence: Number((0.45 + normalized / 200).toFixed(2)),
      riskLevel: normalized >= 70 ? "medium" : normalized >= 50 ? "medium" : "high",
      timeframe: input.mode === "scalp" ? "5m-24h" : "1w-1y",
      headline:
        input.mode === "scalp"
          ? `${input.symbol} 단타 관점은 ${label}입니다. 손절 기준 없이 진입하지 마세요.`
          : `${input.symbol} 장기 관점은 ${label}입니다. 한 번에 진입하기보다 분할 기준을 먼저 잡으세요.`,
      reasons: reasons.slice(0, 3),
      risks: risks.slice(0, 3),
      score: normalized,
    };
  }

  private calculateSeverity(
    topScore: number,
    portfolioRiskLevel: "low" | "medium" | "high",
  ) {
    let severity = Math.min(100, Math.max(35, topScore));

    if (portfolioRiskLevel === "medium") severity += 5;
    if (portfolioRiskLevel === "high") severity += 10;

    return Math.min(100, severity);
  }

  private calculateConfidence(topScore: number, secondScore: number) {
    const spread = Math.max(0, topScore - secondScore);
    const raw =
      0.55 + Math.min(0.3, spread / 100) + Math.min(0.1, topScore / 200);
    return Math.min(0.92, Number(raw.toFixed(2)));
  }
}
