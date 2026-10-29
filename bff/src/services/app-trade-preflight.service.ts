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
      // 서버가 시세로 고른 자산군 — 화면이 비중 분모 이름("보유 코인" · "보유 국내 주식")을 고른다(SRV-REQ-025 FR-66)
      assetType: data.assetType,
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
