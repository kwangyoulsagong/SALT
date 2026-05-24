import { backendApi } from "./backend-api.service";

export class AppBehaviorCoachService {
  async get(token: string) {
    const response = await backendApi.proxyAuthRequest(
      "GET",
      "/behavior-coach",
      token,
    );
    const data = response.data.data;

    return {
      status: data.status,
      tags: data.tags ?? [],
      cards: (data.warnings ?? []).map((warning: any) => ({
        id: warning.id,
        title: warning.title,
        message: warning.message,
        severity: warning.severity >= 80 ? "danger" : "warning",
        confidence: warning.confidence,
      })),
      recommendedRules: data.recommendedRules ?? [],
      evidence: data.evidence,
    };
  }
}

export const appBehaviorCoachService = new AppBehaviorCoachService();
