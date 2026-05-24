import prisma from "../../config/database";
import type { TradePreflightDto } from "./trade-preflight.dto";

export class TradePreflightService {
  async check(userId: string, input: TradePreflightDto) {
    const symbol = input.symbol.toUpperCase();

    const [holdings, holding, profile, market] = await Promise.all([
      prisma.portfolioHolding.findMany({
        where: { userId, assetType: "crypto" },
      }),
      prisma.portfolioHolding.findUnique({
        where: {
          userId_symbol_assetType: {
            userId,
            symbol,
            assetType: "crypto",
          },
        },
      }),
      prisma.userInvestmentProfile.findUnique({ where: { userId } }),
      prisma.marketAsset.findUnique({ where: { symbol } }),
    ]);

    const totalValue = holdings.reduce((sum, item) => sum + item.currentValue, 0);
    const existingValue = holding?.currentValue ?? 0;
    const projectedTotalValue = totalValue + input.amount;
    const projectedSymbolValue = existingValue + input.amount;
    const projectedWeight =
      projectedTotalValue > 0 ? projectedSymbolValue / projectedTotalValue : 1;

    const maxSingleAssetWeight = profile?.maxSingleAssetWeight ?? 0.6;
    const stopLossRate = input.stopPrice
      ? Math.max(0, (input.entryPrice - input.stopPrice) / input.entryPrice)
      : null;
    const maxLossAmount = stopLossRate === null ? null : input.amount * stopLossRate;
    const maxLossRate =
      projectedTotalValue > 0 && maxLossAmount !== null
        ? maxLossAmount / projectedTotalValue
        : null;

    const primaryTakeProfit = input.takeProfitPrices[0];
    const rewardRate = primaryTakeProfit
      ? Math.max(0, (primaryTakeProfit - input.entryPrice) / input.entryPrice)
      : null;
    const riskRewardRatio =
      rewardRate !== null && stopLossRate && stopLossRate > 0
        ? Number((rewardRate / stopLossRate).toFixed(2))
        : null;

    const warnings: Array<{
      code: string;
      severity: "info" | "warning" | "danger";
      message: string;
    }> = [];

    if (!input.stopPrice) {
      warnings.push({
        code: "missing_stop_price",
        severity: input.mode === "scalp" ? "danger" : "warning",
        message: "손절 기준이 없어 최대 손실을 계산할 수 없습니다.",
      });
    }

    if (riskRewardRatio !== null && riskRewardRatio < 1.5) {
      warnings.push({
        code: "weak_risk_reward",
        severity: "warning",
        message: "기대 손익비가 낮습니다. 진입 조건을 다시 검토하세요.",
      });
    }

    if (projectedWeight > maxSingleAssetWeight) {
      warnings.push({
        code: "concentration_risk",
        severity: "danger",
        message: "추가 진입 후 단일 자산 비중 한도를 초과합니다.",
      });
    }

    const priceUpdatedAt = market?.priceUpdatedAt ?? null;
    const stalePrice =
      priceUpdatedAt &&
      Date.now() - priceUpdatedAt.getTime() > 10 * 60 * 1000;

    if (stalePrice) {
      warnings.push({
        code: "stale_price",
        severity: "warning",
        message: "시장 가격 업데이트가 지연되어 있습니다.",
      });
    }

    return {
      symbol,
      mode: input.mode,
      orderExecution: false,
      calculation: {
        entryPrice: input.entryPrice,
        stopPrice: input.stopPrice ?? null,
        takeProfitPrices: input.takeProfitPrices,
        amount: input.amount,
        riskRewardRatio,
        maxLossAmount,
        maxLossRate,
        projectedWeight,
        maxSingleAssetWeight,
      },
      portfolioImpact: {
        totalValue,
        existingSymbolValue: existingValue,
        projectedTotalValue,
        projectedSymbolValue,
        projectedWeight,
      },
      checklist: [
        {
          key: "stop_price",
          passed: !!input.stopPrice,
          label: "손절 기준을 정했는가",
        },
        {
          key: "risk_reward",
          passed: riskRewardRatio !== null && riskRewardRatio >= 1.5,
          label: "손익비가 최소 기준을 넘는가",
        },
        {
          key: "concentration",
          passed: projectedWeight <= maxSingleAssetWeight,
          label: "단일 자산 비중 한도 안인가",
        },
      ],
      warnings,
      dataFreshness: {
        priceUpdatedAt,
        stale: Boolean(stalePrice),
      },
    };
  }
}
