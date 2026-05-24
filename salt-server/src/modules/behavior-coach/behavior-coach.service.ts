import prisma from "../../config/database";
import { BehaviorAnalysisService } from "../investment-insight/behavior-analysis.service";

export class BehaviorCoachService {
  private behaviorAnalysisService = new BehaviorAnalysisService();

  async get(userId: string) {
    await this.behaviorAnalysisService.generateBehaviorAnalysis(userId);

    const [insights, txCount] = await Promise.all([
      prisma.investmentInsight.findMany({
        where: {
          userId,
          type: "behavior_analysis",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 10,
      }),
      prisma.portfolioTransaction.count({
        where: {
          userId,
          assetType: "crypto",
        },
      }),
    ]);

    if (txCount < 3) {
      return {
        status: "insufficient_data",
        tags: [],
        warnings: [],
        recommendedRules: [
          "거래 전 진입가, 손절가, 익절 구간을 기록하세요.",
          "외부 앱에서 주문한 뒤 SALT에 결과를 기록하세요.",
        ],
        evidence: {
          transactionCount: txCount,
          minimumRequired: 3,
        },
      };
    }

    const tags = insights.map((insight) => {
      const payload = (insight.payload as Record<string, any> | null) ?? {};
      return payload.kind ?? insight.dedupeKey;
    });

    return {
      status: insights.length ? "active" : "stable",
      tags,
      warnings: insights.map((insight) => ({
        id: insight.id,
        title: insight.title,
        message: insight.summary,
        severity: insight.severity,
        confidence: insight.confidence,
        payload: insight.payload,
      })),
      recommendedRules: this.buildRules(tags),
      evidence: {
        transactionCount: txCount,
        insightCount: insights.length,
      },
    };
  }

  private buildRules(tags: string[]) {
    const rules = new Set<string>();

    if (tags.includes("over_trading")) {
      rules.add("오늘 추가 거래 횟수를 제한하고, 같은 종목 재진입 전 30분을 기다리세요.");
    }

    if (tags.includes("panic_sell")) {
      rules.add("시장가 매도 전 최초 매수 논리가 깨졌는지 먼저 확인하세요.");
    }

    if (tags.includes("chasing_high")) {
      rules.add("급등 직후 진입보다 대기 가격 알림을 먼저 설정하세요.");
    }

    if (!rules.size) {
      rules.add("현재 뚜렷한 반복 손실 패턴은 적지만, 거래 전 계획 기록은 유지하세요.");
    }

    return Array.from(rules);
  }
}
