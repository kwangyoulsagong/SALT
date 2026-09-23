import { toUpstreamClientError } from "../utils/error.util";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import {
  toCoachReportViewModel,
  type CoachReportResult,
  type ServerCoachDetail,
} from "./coach-report.viewmodel";

/** `BFF-REQ-025` 호출 맵 — 리포트 800ms · 생성 상태 300ms, 둘 다 재시도 1회 */
const COACH_REPORT_TIMEOUT_MS = 800;
const GENERATION_STATUS_TIMEOUT_MS = 300;

type BackendEnvelope<T> = { success: boolean; message?: string; data: T };

export interface GenerationStatusViewModel {
  lastGeneratedAt: string | null;
  lastRequest: { requestedAt: string; source: string; status: string } | null;
  inProgress: boolean;
  cooldownSeconds: number;
  /** 0 이면 지금 재생성을 누를 수 있다. 판정은 서버가 했다(`BFF-REQ-023` FR-61) */
  retryAfterSeconds: number;
}

/**
 * 코치 리포트 · 생성 상태 (`BFF-REQ-023` FR-10~14 · FR-61~63).
 *
 * ## 무엇이 `unavailable` 이고 무엇이 에러인가
 *
 * - 서버 **4xx 는 그대로 올린다.** 401 이 `unavailable` 로 바뀌면 프론트가 토큰을 갱신하지
 *   못한다(`FE-REQ-011` FR-62). error middleware 가 원 status 로 옮긴다
 * - 5xx · 타임아웃 · 연결 실패 · 계약 깨짐은 **200 `{ status: 'unavailable' }`** (FR-12 · 13).
 *   옛 응답을 캐시해 두었다가 주지 않는다 — BFF 에 상태를 두지 않는다
 */
export class AppCoachReportService {
  async getReport(token: string, signal?: AbortSignal): Promise<CoachReportResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", "/coach/detail", token, undefined, {
            timeout: COACH_REPORT_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      const data = (response.data as BackendEnvelope<ServerCoachDetail>).data;
      return toCoachReportViewModel(data ?? {});
    } catch (error) {
      if (toUpstreamClientError(error) || signal?.aborted) throw error;
      return { status: "unavailable" };
    }
  }

  /** 서버 판정을 그대로 옮긴다. BFF 가 쿨다운을 세지 않는다(FR-61) */
  async getGenerationStatus(token: string): Promise<GenerationStatusViewModel> {
    const response = await retryOnceOnGet(() =>
      backendApi.proxyAuthRequest(
        "GET",
        "/coach/generation-status",
        token,
        undefined,
        { timeout: GENERATION_STATUS_TIMEOUT_MS },
      ),
    );
    const data = (response.data as BackendEnvelope<GenerationStatusViewModel>).data;

    return {
      lastGeneratedAt: data.lastGeneratedAt,
      lastRequest: data.lastRequest,
      inProgress: data.inProgress,
      cooldownSeconds: data.cooldownSeconds,
      retryAfterSeconds: data.retryAfterSeconds,
    };
  }
}

export const appCoachReportService = new AppCoachReportService();
