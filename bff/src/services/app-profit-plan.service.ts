import { backendApi } from "./backend-api.service";

export class AppProfitPlanService {
  async get(token: string, query: any) {
    const qs = query.symbol
      ? `?symbol=${encodeURIComponent(query.symbol.toString().toUpperCase())}`
      : "";
    const response = await backendApi.proxyAuthRequest(
      "GET",
      `/profit-plan${qs}`,
      token,
    );
    const data = response.data.data;

    return {
      status: data.status,
      cards: (data.plans ?? []).map((plan: any) => ({
        symbol: plan.symbol,
        status: plan.status,
        currentPrice: plan.currentPrice,
        averageBuyPrice: plan.averageBuyPrice,
        profitRate: plan.unrealizedProfitRate,
        stages: plan.stages,
        // 가격선 근거(F010 슬라이스 2) — `volatility` · `fixed`. 모르면 `null`
        basis: plan.basis === "volatility" || plan.basis === "fixed" ? plan.basis : null,
        warnings: plan.warnings,
        generatedAt: plan.generatedAt,
      })),
    };
  }
}

export const appProfitPlanService = new AppProfitPlanService();
