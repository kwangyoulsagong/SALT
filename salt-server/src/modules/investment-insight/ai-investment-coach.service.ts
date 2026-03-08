import prisma from "../../config/database";
import { Timeframe } from "@prisma/client";

type CoachAction = "buy" | "sell" | "hold";

type CoachReason = {
  type: string;
  message: string;
  value?: number | string | null;
};

type CoachRisk = {
  type: string;
  symbol?: string;
  message: string;
  severity?: number;
};

export class AIInvestmentCoachService {
  async generateCoach(userId: string) {
    const portfolio = await prisma.portfolioHolding.findMany({
      where: { userId },
      orderBy: { currentValue: "desc" },
    });

    if (!portfolio.length) return null;

    const totalValue = portfolio.reduce(
      (sum, item) => sum + Number(item.currentValue ?? 0),
      0,
    );

    if (totalValue <= 0) return null;

    const profile = await prisma.userInvestmentProfile.findUnique({
      where: { userId },
    });

    const maxWeight = profile?.maxSingleAssetWeight ?? 0.6;

    /**
     * 인사이트 조회
     */
    const insights = await prisma.investmentInsight.findMany({
      where: {
        OR: [{ userId }, { userId: "global" }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    const riskInsights = insights.filter((i) => i.type === "risk_alert");
    const buyZoneInsights = insights.filter((i) => i.type === "smart_buy_zone");
    const behaviorInsights = insights.filter(
      (i) => i.type === "behavior_analysis",
    );

    const topHolding = portfolio[0];
    const topWeight = Number(topHolding.currentValue ?? 0) / totalValue;

    /**
     * Technical Indicator 조회
     */
    const indicators = await prisma.technicalIndicator.findMany({
      where: {
        symbol: { in: portfolio.map((p) => p.symbol) },
        timeframe: Timeframe.m5,
      },
      orderBy: { timestamp: "desc" },
      distinct: ["symbol"],
    });

    const indicatorMap = new Map(indicators.map((i) => [i.symbol, i]));

    /**
     * Sentiment 조회
     */
    const sentiments = await prisma.marketSentiment.findMany({
      where: {
        symbol: { in: portfolio.map((p) => p.symbol) },
      },
      orderBy: { calculatedAt: "desc" },
      distinct: ["symbol"],
    });

    const sentimentMap = new Map(sentiments.map((s) => [s.symbol, s]));

    /**
     * Price Map (N+1 제거)
     */
    const assets = await prisma.marketAsset.findMany({
      where: {
        symbol: { in: portfolio.map((p) => p.symbol) },
      },
      select: {
        symbol: true,
        currentPrice: true,
      },
    });

    const priceMap = new Map(
      assets.map((a) => [a.symbol, Number(a.currentPrice ?? 0)]),
    );

    let action: CoachAction = "hold";
    let targetSymbol = topHolding.symbol;

    const reasons: CoachReason[] = [];
    const risks: CoachRisk[] = [];
    const actions: string[] = [];

    /**
     * 1️⃣ 포트폴리오 집중 위험
     */
    if (topWeight >= maxWeight) {
      action = "hold";

      risks.push({
        type: "concentration",
        symbol: topHolding.symbol,
        message: `${topHolding.symbol} 비중이 ${(topWeight * 100).toFixed(1)}%로 높습니다.`,
        severity: 75,
      });

      actions.push(`${topHolding.symbol} 추가 매수는 보수적으로 접근하세요.`);
      actions.push(`분산 투자 관점에서 다른 자산 비중도 점검하세요.`);
    }

    /**
     * 2️⃣ Smart Buy Zone 선택 (severity 고려)
     */
    const buyZone =
      buyZoneInsights
        .filter((b) => portfolio.some((p) => p.symbol === b.symbol))
        .sort((a, b) => b.severity - a.severity)[0] ??
      buyZoneInsights.sort((a, b) => b.severity - a.severity)[0];

    if (buyZone?.symbol) {
      const indicator = indicatorMap.get(buyZone.symbol);
      const sentiment = sentimentMap.get(buyZone.symbol);

      targetSymbol = buyZone.symbol;

      const targetHolding = portfolio.find((p) => p.symbol === buyZone.symbol);

      const targetWeight = targetHolding
        ? Number(targetHolding.currentValue ?? 0) / totalValue
        : 0;

      if (targetWeight < maxWeight * 0.9) {
        action = "buy";
      } else {
        action = "hold";

        risks.push({
          type: "position_limit",
          symbol: buyZone.symbol,
          message: `${buyZone.symbol}는 매수 신호가 있지만 이미 포트폴리오 비중이 높습니다.`,
          severity: 65,
        });
      }

      reasons.push({
        type: "buy_zone",
        message: `${buyZone.symbol}가 스마트 매수 구간으로 감지되었습니다.`,
      });

      if (indicator?.rsi14 != null) {
        reasons.push({
          type: "rsi",
          value: indicator.rsi14,
          message: `RSI(14)가 ${indicator.rsi14.toFixed(
            1,
          )}로 과매도 구간에 가깝습니다.`,
        });
      }

      if (indicator?.ma20 != null) {
        const currentPrice =
          targetHolding?.currentPrice ?? priceMap.get(buyZone.symbol) ?? 0;

        if (currentPrice > 0) {
          const diff = ((currentPrice - indicator.ma20) / indicator.ma20) * 100;

          reasons.push({
            type: "ma20",
            value: diff,
            message:
              diff < 0
                ? `현재 가격이 MA20 대비 ${Math.abs(diff).toFixed(1)}% 낮습니다.`
                : `현재 가격이 MA20 대비 ${diff.toFixed(1)}% 높습니다.`,
          });
        }
      }

      const fearGreed = sentiment?.fearGreedIndex ?? null;

      if (fearGreed != null) {
        reasons.push({
          type: "fear_greed",
          value: fearGreed,
          message: `시장 공포지수는 ${fearGreed}로 투자심리가 위축된 상태입니다.`,
        });
      }

      if (action === "buy") {
        actions.push(
          `${buyZone.symbol}는 분할 매수 관점으로 접근하는 것이 좋습니다.`,
        );
      }
    }

    /**
     * 3️⃣ 리스크 인사이트 반영
     */
    for (const risk of riskInsights) {
      const payload = risk.payload as Record<string, any> | null;

      risks.push({
        type: String(payload?.riskType ?? "risk_alert"),
        symbol: payload?.symbol,
        message: risk.summary,
        severity: risk.severity,
      });
    }

    /**
     * 4️⃣ 행동 분석 반영
     */
    for (const behavior of behaviorInsights.slice(0, 2)) {
      risks.push({
        type: "behavior",
        message: behavior.summary,
        severity: behavior.severity,
      });
    }

    if (behaviorInsights.length > 0) {
      actions.push(
        "최근 거래 패턴을 보면 감정적 매매를 줄이고 분할 접근이 필요합니다.",
      );
    }

    /**
     * 5️⃣ 매도 시그널 (RSI + 수익률)
     */
    const overheatedHolding = portfolio.find((holding) => {
      const indicator = indicatorMap.get(holding.symbol);

      return (
        indicator?.rsi14 != null &&
        indicator.rsi14 >= 70 &&
        Number(holding.unrealizedProfitRate ?? 0) >= 0.12
      );
    });

    if (overheatedHolding) {
      const indicator = indicatorMap.get(overheatedHolding.symbol);

      action = "sell";
      targetSymbol = overheatedHolding.symbol;

      reasons.unshift({
        type: "take_profit",
        value: indicator?.rsi14 ?? null,
        message: `${overheatedHolding.symbol}는 RSI가 ${indicator?.rsi14?.toFixed(
          1,
        )}로 과열 구간이며 평가수익도 높습니다.`,
      });

      actions.unshift(
        `${overheatedHolding.symbol}는 일부 차익실현 또는 비중 축소를 고려할 수 있습니다.`,
      );
    }

    /**
     * 기본 문구
     */
    if (!reasons.length) {
      reasons.push({
        type: "neutral",
        message: "현재 명확한 공격적 매수/매도 신호는 제한적입니다.",
      });
    }

    if (!actions.length) {
      actions.push("현재 포트폴리오를 유지하며 다음 신호를 관찰하세요.");
    }

    const confidence = this.calculateConfidence({
      reasonsCount: reasons.length,
      risksCount: risks.length,
      hasBuyZone: !!buyZone,
      hasBehaviorRisk: behaviorInsights.length > 0,
      action,
    });

    const severity = this.calculateSeverity({
      action,
      reasons,
      risks,
    });

    const summary = this.buildSummary({
      action,
      symbol: targetSymbol,
      reasons,
      risks,
      actions,
    });

    return prisma.investmentInsight.upsert({
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
        payload: {
          recommendation: {
            action,
            symbol: targetSymbol,
          },
          reasons,
          risks,
          actions,
          portfolio: {
            totalValue,
            topSymbol: topHolding.symbol,
            topWeight,
          },
        },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      update: {
        summary,
        severity,
        confidence,
        payload: {
          recommendation: {
            action,
            symbol: targetSymbol,
          },
          reasons,
          risks,
          actions,
          portfolio: {
            totalValue,
            topSymbol: topHolding.symbol,
            topWeight,
          },
        },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
  }

  private calculateConfidence(params: {
    reasonsCount: number;
    risksCount: number;
    hasBuyZone: boolean;
    hasBehaviorRisk: boolean;
    action: CoachAction;
  }) {
    let confidence = 0.55;

    if (params.hasBuyZone) confidence += 0.15;
    if (params.reasonsCount >= 3) confidence += 0.1;
    if (params.action === "sell") confidence += 0.05;
    if (params.hasBehaviorRisk) confidence -= 0.05;
    if (params.risksCount >= 3) confidence -= 0.05;

    return Math.max(0.5, Math.min(0.92, Number(confidence.toFixed(2))));
  }

  private calculateSeverity(params: {
    action: CoachAction;
    reasons: CoachReason[];
    risks: CoachRisk[];
  }) {
    let severity = 45;

    if (params.action === "buy") severity += 10;
    if (params.action === "sell") severity += 20;

    const highRiskCount = params.risks.filter(
      (r) => (r.severity ?? 0) >= 70,
    ).length;

    severity += highRiskCount * 10;

    return Math.min(100, severity);
  }

  private buildSummary(params: {
    action: CoachAction;
    symbol: string;
    reasons: CoachReason[];
    risks: CoachRisk[];
    actions: string[];
  }) {
    const actionText =
      params.action === "buy"
        ? "매수 고려"
        : params.action === "sell"
          ? "일부 매도 고려"
          : "보유 유지";

    const reasonText = params.reasons
      .slice(0, 3)
      .map((r) => `• ${r.message}`)
      .join("\n");

    const riskText =
      params.risks.length > 0
        ? params.risks
            .slice(0, 3)
            .map((r) => `• ${r.message}`)
            .join("\n")
        : "• 현재 감지된 핵심 리스크는 제한적입니다.";

    const actionGuide = params.actions
      .slice(0, 3)
      .map((a) => `• ${a}`)
      .join("\n");

    return [
      `AI 투자 코치`,
      "",
      `추천`,
      `${params.symbol} ${actionText}`,
      "",
      `근거`,
      reasonText,
      "",
      `리스크`,
      riskText,
      "",
      `가이드`,
      actionGuide,
    ].join("\n");
  }
}
