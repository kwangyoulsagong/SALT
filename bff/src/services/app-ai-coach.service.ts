import { backendApi } from "./backend-api.service";

type BackendEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export class AppAICoachService {
  async getPreview(token: string, query: any) {
    const symbol = (query.symbol || "BTC").toString().toUpperCase();
    const response = await backendApi.proxyAuthRequest(
      "GET",
      `/ai-coach?symbol=${encodeURIComponent(symbol)}&preview=true`,
      token,
    );
    const data = (response.data as BackendEnvelope<any>).data;

    return {
      symbol: data.symbol,
      headline: data.headline,
      badge: data.modeDecision?.label ?? "관망",
      decisions: {
        scalp: this.mapDecision(data.dualDecision?.scalp),
        longTerm: this.mapDecision(data.dualDecision?.longTerm),
      },
      reasons: data.modeDecision?.reasons ?? [],
      risks: data.modeDecision?.risks ?? [],
      missingData: data.missingData ?? [],
      dataFreshness: data.dataFreshness,
    };
  }

  async getDetail(token: string, query: any) {
    const symbol = (query.symbol || "BTC").toString().toUpperCase();
    const mode = query.mode === "long_term" ? "long_term" : "scalp";
    const response = await backendApi.proxyAuthRequest(
      "GET",
      `/ai-coach?symbol=${encodeURIComponent(symbol)}&mode=${mode}`,
      token,
    );
    const newsResponse = await backendApi.proxyAuthRequest(
      "GET",
      `/market-intelligence/${encodeURIComponent(symbol)}/news?limit=3`,
      token,
    );
    const data = (response.data as BackendEnvelope<any>).data;
    const news = (newsResponse.data as BackendEnvelope<any>).data;

    return {
      header: {
        symbol: data.symbol,
        mode: data.mode,
        headline: data.headline,
        badge: data.modeDecision?.label,
      },
      decisionCards: [
        this.mapDecision(data.dualDecision?.scalp),
        this.mapDecision(data.dualDecision?.longTerm),
      ].filter(Boolean),
      riskGuard: data.riskGuard,
      preflightDefaults: {
        symbol: data.symbol,
        entryPrice: data.evidence?.price,
        mode: data.mode,
      },
      evidence: {
        ...data.evidence,
        news: news.articles ?? [],
      },
      missingData: data.missingData ?? [],
      dataFreshness: data.dataFreshness,
    };
  }

  async getProfile(token: string) {
    const response = await backendApi.proxyAuthRequest(
      "GET",
      "/ai-coach/profile",
      token,
    );
    const data = (response.data as BackendEnvelope<any>).data;

    return {
      riskTolerance: data.riskTolerance,
      maxSingleAssetWeight: data.maxSingleAssetWeight,
      rebalanceBand: data.rebalanceBand,
      panicSellWindowHours: data.panicSellWindowHours,
      defaultMode: data.defaultMode,
      notificationLevel: data.notificationLevel,
      supportedModes: data.supportedModes ?? ["scalp", "long_term"],
    };
  }

  async updateProfile(token: string, body: any) {
    const response = await backendApi.proxyAuthRequest(
      "PATCH",
      "/ai-coach/profile",
      token,
      body,
    );
    const data = (response.data as BackendEnvelope<any>).data;

    return {
      riskTolerance: data.riskTolerance,
      maxSingleAssetWeight: data.maxSingleAssetWeight,
      rebalanceBand: data.rebalanceBand,
      panicSellWindowHours: data.panicSellWindowHours,
      defaultMode: data.defaultMode,
      notificationLevel: data.notificationLevel,
      unsupportedPersistedFields: data.unsupportedPersistedFields ?? [],
    };
  }

  async feedback(token: string, body: any) {
    const response = await backendApi.proxyAuthRequest(
      "POST",
      "/ai-coach/feedback",
      token,
      body,
    );
    const data = (response.data as BackendEnvelope<any>).data;

    return {
      id: data.id,
      symbol: data.symbol,
      recordedAt: data.createdAt,
      status: "recorded",
    };
  }

  // LLM(Gemini) 해설 — salt-server의 public 엔드포인트로 프록시
  async explain(body: any) {
    const response = await backendApi.proxyRequest(
      "POST",
      "/ai-coach/explain",
      body,
    );
    return (response.data as BackendEnvelope<any>).data;
  }

  private mapDecision(decision: any) {
    if (!decision) return null;

    return {
      mode: decision.mode,
      label: decision.label,
      action: decision.action,
      confidence: decision.confidence,
      riskLevel: decision.riskLevel,
      timeframe: decision.timeframe,
      headline: decision.headline,
      reasons: decision.reasons ?? [],
      risks: decision.risks ?? [],
      score: decision.score,
    };
  }
}

export const appAICoachService = new AppAICoachService();
