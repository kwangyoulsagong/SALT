import { backendApi } from "./backend-api.service";

export class AppSignalPerformanceService {
  async get(token: string, query: any) {
    const params = new URLSearchParams();
    if (query.symbol) params.set("symbol", query.symbol.toString().toUpperCase());
    if (query.signalKey) params.set("signalKey", query.signalKey.toString());
    const qs = params.toString() ? `?${params.toString()}` : "";

    const response = await backendApi.proxyAuthRequest(
      "GET",
      `/signal-performance${qs}`,
      token,
    );
    const data = response.data.data;

    return {
      status: data.status,
      metrics: {
        sampleCount: data.sampleCount,
        winRate: data.winRate,
        avgReturn: data.avgReturn,
        maxDrawdown: data.maxDrawdown,
      },
      samples: data.samples ?? [],
      generatedAt: data.generatedAt,
    };
  }
}

export const appSignalPerformanceService = new AppSignalPerformanceService();
