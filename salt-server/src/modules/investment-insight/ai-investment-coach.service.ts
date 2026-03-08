import prisma from "../../config/database";

type CoachRecommendation = {
  action: "buy" | "sell" | "hold";
  symbol: string;
};

type CoachReason = {
  type: string;
  message: string;
  value?: number;
  symbol?: string | null;
};

type CoachRisk = {
  type: string;
  message: string;
  symbol?: string | null;
  value?: number;
};

type CoachPayload = {
  recommendation: CoachRecommendation;
  reasons: CoachReason[];
  risks: CoachRisk[];
  actions: string[];
  portfolio: {
    topAsset: string;
    weight: number;
    totalValue: number;
  };
};

export class AIInvestmentCoachService {
  async generateCoach(userId: string) {
    /**
     * 1) 사용자 포트폴리오
     */
    const portfolio = await prisma.portfolioHolding.findMany({
      where: { userId },
      orderBy: { currentValue: "desc" },
    });

    if (portfolio.length === 0) return null;

    const totalValue = portfolio.reduce(
      (sum, p) => sum + Number(p.currentValue ?? 0),
      0,
    );

    const topAsset = portfolio[0];
    const weight =
      totalValue > 0 ? Number(topAsset.currentValue ?? 0) / totalValue : 0;

    /**
     * 2) 관련 인사이트 조회
     * - 사용자 전용: risk_alert, behavior_analysis 등
     * - global: smart_buy_zone 만 허용
     */
    const insights = await prisma.investmentInsight.findMany({
      where: {
        OR: [
          { userId },
          {
            userId: "global",
            type: "smart_buy_zone",
          },
        ],
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 20,
    });

    const buyZones = insights.filter((i) => i.type === "smart_buy_zone");
    const risks = insights.filter((i) => i.type === "risk_alert");
    const behaviors = insights.filter((i) => i.type === "behavior_analysis");

    /**
     * 3) 결과 구조
     */
    let recommendation: CoachRecommendation = {
      action: "hold",
      symbol: topAsset.symbol,
    };

    const reasons: CoachReason[] = [];
    const riskFactors: CoachRisk[] = [];
    const actions = new Set<string>();

    /**
     * 4) Buy Zone 반영
     * severity 높은 1개만 대표 추천으로 사용
     */
    const primaryBuyZone = buyZones[0];

    if (primaryBuyZone) {
      recommendation = {
        action: "buy",
        symbol: primaryBuyZone.symbol ?? topAsset.symbol,
      };

      reasons.push({
        type: "buy_zone",
        symbol: primaryBuyZone.symbol,
        message: `${primaryBuyZone.symbol}는 현재 매수 구간 신호가 있습니다.`,
      });

      const payload = primaryBuyZone.payload as
        | {
            rsi?: number;
            fearGreed?: number;
            ma20?: number;
            currentPrice?: number;
            volatility?: number;
          }
        | undefined;

      if (payload?.rsi !== undefined && payload.rsi !== null) {
        reasons.push({
          type: "rsi",
          value: payload.rsi,
          symbol: primaryBuyZone.symbol,
          message: `RSI ${payload.rsi.toFixed(1)}로 과매도 구간에 가깝습니다.`,
        });
      }

      if (payload?.fearGreed !== undefined && payload.fearGreed !== null) {
        reasons.push({
          type: "fear_greed",
          value: payload.fearGreed,
          symbol: primaryBuyZone.symbol,
          message: `시장 공포 지수가 ${payload.fearGreed} 수준입니다.`,
        });
      }

      if (
        payload?.ma20 !== undefined &&
        payload?.ma20 !== null &&
        payload?.currentPrice !== undefined &&
        payload?.currentPrice !== null &&
        payload.ma20 !== 0
      ) {
        const diff =
          ((payload.currentPrice - payload.ma20) / payload.ma20) * 100;

        reasons.push({
          type: "ma20_gap",
          value: diff,
          symbol: primaryBuyZone.symbol,
          message:
            diff < 0
              ? `현재 가격이 MA20 대비 ${Math.abs(diff).toFixed(1)}% 낮습니다.`
              : `현재 가격이 MA20 대비 ${diff.toFixed(1)}% 높습니다.`,
        });
      }

      actions.add(
        `${primaryBuyZone.symbol}는 한 번에 매수하지 말고 분할 매수를 고려하세요.`,
      );
    }

    /**
     * 5) Risk Alert 반영
     */
    for (const r of risks) {
      const payload = r.payload as
        | {
            riskType?: "concentration" | "drawdown";
            symbol?: string;
            weight?: number;
            threshold?: number;
            lossRate?: number;
            invested?: number;
          }
        | undefined;

      if (!payload?.riskType) continue;

      if (payload.riskType === "concentration") {
        const message =
          payload.weight !== undefined
            ? `${payload.symbol} 비중이 ${(payload.weight * 100).toFixed(1)}%로 높아 포트폴리오가 한 자산에 집중되어 있습니다.`
            : r.summary;

        riskFactors.push({
          type: "concentration",
          symbol: payload.symbol,
          value: payload.weight,
          message,
        });

        if (payload.symbol) {
          actions.add(
            `${payload.symbol} 비중을 줄이고 다른 자산으로 분산하는 방안을 검토하세요.`,
          );
        }
      }

      if (payload.riskType === "drawdown") {
        const message =
          payload.lossRate !== undefined
            ? `${payload.symbol}의 평가손실이 ${(payload.lossRate * 100).toFixed(1)}%입니다.`
            : r.summary;

        riskFactors.push({
          type: "drawdown",
          symbol: payload.symbol,
          value: payload.lossRate,
          message,
        });

        if (payload.symbol) {
          actions.add(
            `${payload.symbol}는 손절 기준 또는 추가매수 기준을 다시 점검하세요.`,
          );
        }
      }
    }

    /**
     * 6) Behavior Analysis 반영
     * 여러 개가 있어도 가장 심각한 1개만 대표 반영
     */
    const primaryBehavior = behaviors[0];
    if (primaryBehavior) {
      riskFactors.push({
        type: "behavior",
        message: primaryBehavior.summary,
      });

      actions.add(
        "최근 거래 패턴을 보면 감정적 매매 가능성이 있어 거래 빈도를 줄이는 것이 좋습니다.",
      );
    }

    /**
     * 7) 기본 메시지 보정
     */
    if (reasons.length === 0) {
      reasons.push({
        type: "neutral_market",
        message:
          "현재 뚜렷한 매수 신호는 없으며 시장은 중립 구간으로 보입니다.",
      });
    }

    if (riskFactors.length === 0) {
      riskFactors.push({
        type: "no_major_risk",
        message: "현재 확인된 주요 리스크 신호는 크지 않습니다.",
      });
    }

    if (actions.size === 0) {
      actions.add("현재 포트폴리오 전략을 유지하면서 시장 변화를 관찰하세요.");
    }

    /**
     * 8) summary 생성
     */
    const summaryLines: string[] = [
      `추천: ${recommendation.symbol} ${recommendation.action}`,
      "",
      "이유",
      ...reasons.map((r) => `• ${r.message}`),
      "",
      "리스크",
      ...riskFactors.map((r) => `• ${r.message}`),
      "",
      "추천 행동",
      ...Array.from(actions).map((a) => `• ${a}`),
    ];

    const summary = summaryLines.join("\n");

    const payload: CoachPayload = {
      recommendation,
      reasons,
      risks: riskFactors,
      actions: Array.from(actions),
      portfolio: {
        topAsset: topAsset.symbol,
        weight,
        totalValue,
      },
    };

    /**
     * 9) DB 저장
     */
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
        severity: Math.max(
          30,
          ...riskFactors.map((r) => {
            if (r.type === "concentration" && typeof r.value === "number") {
              return Math.min(100, Math.round(r.value * 100));
            }
            if (r.type === "drawdown" && typeof r.value === "number") {
              return Math.min(100, Math.round(Math.abs(r.value) * 200));
            }
            return 40;
          }),
        ),
        confidence: 0.85,
        payload,
        dedupeKey: "main_coach",
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
      update: {
        summary,
        severity: Math.max(
          30,
          ...riskFactors.map((r) => {
            if (r.type === "concentration" && typeof r.value === "number") {
              return Math.min(100, Math.round(r.value * 100));
            }
            if (r.type === "drawdown" && typeof r.value === "number") {
              return Math.min(100, Math.round(Math.abs(r.value) * 200));
            }
            return 40;
          }),
        ),
        confidence: 0.85,
        payload,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
  }
}
