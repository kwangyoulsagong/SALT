import { backendApi } from "./backend-api.service";

export class AppTradePreflightService {
  async check(token: string, body: any) {
    const response = await backendApi.proxyAuthRequest(
      "POST",
      "/trade-preflight",
      token,
      body,
    );
    const data = response.data.data;

    return {
      symbol: data.symbol,
      mode: data.mode,
      orderExecution: false,
      calculation: data.calculation,
      portfolioImpact: data.portfolioImpact,
      checklist: data.checklist.map((item: any) => ({
        ...item,
        severity: item.passed ? "ok" : "warning",
      })),
      warnings: data.warnings,
      dataFreshness: data.dataFreshness,
    };
  }
}

export const appTradePreflightService = new AppTradePreflightService();
