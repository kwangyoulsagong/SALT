import prisma from "../../config/database";
import type { ProfitPlanQueryDto } from "./profit-plan.dto";

export class ProfitPlanService {
  async getPlans(userId: string, query: ProfitPlanQueryDto) {
    const where: any = { userId, assetType: "crypto" };
    if (query.symbol) where.symbol = query.symbol.toUpperCase();

    const holdings = await prisma.portfolioHolding.findMany({
      where,
      orderBy: { currentValue: "desc" },
    });

    const plans = holdings.map((holding) => {
      const profitRate = holding.unrealizedProfitRate;
      const currentPrice = holding.currentPrice || holding.averageBuyPrice;
      const averageBuyPrice = holding.averageBuyPrice;
      const stopPrice =
        profitRate > 10 ? currentPrice * 0.94 : averageBuyPrice * 0.92;
      const firstTakeProfit =
        profitRate >= 15 ? currentPrice : averageBuyPrice * 1.12;
      const secondTakeProfit = averageBuyPrice * 1.25;

      const status =
        profitRate >= 20
          ? "take_profit_review"
          : profitRate <= -8
            ? "stop_loss_review"
            : profitRate >= 8
              ? "raise_stop_review"
              : "hold_plan";

      return {
        symbol: holding.symbol,
        status,
        currentPrice,
        averageBuyPrice,
        totalQuantity: holding.totalQuantity,
        currentValue: holding.currentValue,
        unrealizedProfit: holding.unrealizedProfit,
        unrealizedProfitRate: profitRate,
        stages: [
          {
            key: "protect_loss",
            label: "손실 제한",
            price: Number(stopPrice.toFixed(2)),
            action: "stop_loss_review",
            ratio: 0.25,
          },
          {
            key: "first_profit",
            label: "1차 익절 검토",
            price: Number(firstTakeProfit.toFixed(2)),
            action: "take_profit_review",
            ratio: 0.25,
          },
          {
            key: "trend_hold",
            label: "추세 유지 구간",
            price: Number(secondTakeProfit.toFixed(2)),
            action: "hold_or_trail_stop",
            ratio: 0.5,
          },
        ],
        warnings: this.buildWarnings(profitRate),
        generatedAt: new Date().toISOString(),
      };
    });

    return {
      status: plans.length ? "active" : "empty",
      plans,
    };
  }

  private buildWarnings(profitRate: number) {
    const warnings: string[] = [];
    if (profitRate >= 20) {
      warnings.push("수익 중인 종목은 전량 매도보다 단계형 익절을 검토하세요.");
    }
    if (profitRate <= -8) {
      warnings.push("손실 중인 종목은 물타기보다 최초 투자 논리 훼손 여부를 먼저 확인하세요.");
    }
    if (!warnings.length) {
      warnings.push("현재는 계획 유지와 다음 점검 가격 확인이 우선입니다.");
    }
    return warnings;
  }
}
