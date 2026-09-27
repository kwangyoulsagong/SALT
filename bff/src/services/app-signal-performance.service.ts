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

    // F010 슬라이스 0 — 표본은 30일 뒤 채점된 추천 스냅샷이고(`exitPrice`), 20 미만이면 `insufficient_data`.
    // 기저율(`alwaysUpRate`) · 초과 적중률(`excessWinRate`)을 함께 준다. 없으면 `null`.
    return {
      status: data.status,
      signalType: data.signalType ?? null,
      metrics: {
        sampleCount: data.sampleCount,
        winRate: data.winRate,
        avgReturn: data.avgReturn,
        worstObservedReturn: data.worstObservedReturn,
        lowSample: data.lowSample === true,
        horizonHours: data.horizonHours ?? null,
        alwaysUpRate: data.alwaysUpRate ?? null,
        excessWinRate: data.excessWinRate ?? null,
      },
      samples: data.samples ?? [],
      generatedAt: data.generatedAt,
    };
  }
}

export const appSignalPerformanceService = new AppSignalPerformanceService();
