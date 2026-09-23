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
        // 코드 + 수치만 옮긴다. 문장은 프론트가 만든다(`BFF-REQ-023` FR-40). 서버가 판정을
        // 읽지 못했으면 `null` · `{}` 이고 그대로 둔다 — 기본값을 채우지 않는다
        factCode: warning.factCode ?? null,
        params: warning.params ?? {},
      })),
      recommendedRules: data.recommendedRules ?? [],
      evidence: data.evidence,
    };
  }
}

export const appBehaviorCoachService = new AppBehaviorCoachService();
