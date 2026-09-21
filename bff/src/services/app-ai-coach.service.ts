import { AppError } from "../utils/error.util";
import { backendApi } from "./backend-api.service";
import {
  SymbolCoachContractError,
  toSymbolCoachViewModel,
  type ServerSymbolCoach,
  type ServerSymbolNews,
} from "./symbol-coach.viewmodel";

/** `BFF-REQ-025` 호출 맵 — 판단 · 뉴스 모두 300ms. 화면 예산 200ms(`BFF-REQ-026` FR-50) */
const SYMBOL_COACH_TIMEOUT_MS = 300;
const SYMBOL_NEWS_TIMEOUT_MS = 300;

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
      // 판단이 없으면 `null` — "관망" 을 지어내지 않는다(`BFF-REQ-023` FR-93)
      badge: data.modeDecision?.label ?? null,
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

  /**
   * 종목 판단 — 우측 AI 코치 패널 · 상세 분석 페이지 (`BFF-REQ-023` FR-90~99).
   *
   * 판단과 뉴스를 **병렬로** 부른다(FR-97). 판단이 실패하면 응답 전체가 실패하고,
   * 뉴스가 실패하면 판단은 응답하고 `degradedFields: ['news']` 다.
   *
   * `mode` 가 없으면 서버에 보내지 않는다 — 기본 모드는 서버가 정한다(FR-94 · B16).
   */
  async getDetail(token: string, query: any, signal?: AbortSignal) {
    const symbol = encodeURIComponent(
      (query.symbol || "BTC").toString().toUpperCase(),
    );
    const mode =
      query.mode === "scalp" || query.mode === "long_term"
        ? `&mode=${query.mode}`
        : "";

    const [coach, news] = await Promise.allSettled([
      backendApi.proxyAuthRequest(
        "GET",
        `/ai-coach?symbol=${symbol}${mode}`,
        token,
        undefined,
        { timeout: SYMBOL_COACH_TIMEOUT_MS, signal },
      ),
      backendApi.proxyAuthRequest(
        "GET",
        `/market-intelligence/${symbol}/news?limit=3`,
        token,
        undefined,
        { timeout: SYMBOL_NEWS_TIMEOUT_MS, signal },
      ),
    ]);

    if (coach.status === "rejected") throw coach.reason;

    const data = (coach.value.data as BackendEnvelope<ServerSymbolCoach>).data;
    const newsData =
      news.status === "fulfilled"
        ? (news.value.data as BackendEnvelope<ServerSymbolNews>).data
        : null;

    try {
      return toSymbolCoachViewModel(data, newsData);
    } catch (error) {
      if (error instanceof SymbolCoachContractError) {
        throw new AppError("coach_unavailable", 502);
      }
      throw error;
    }
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
