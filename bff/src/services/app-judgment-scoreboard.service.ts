import { toUpstreamClientError } from "../utils/error.util";
import { logger } from "../config/logger";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import { toJudgmentScoreboardViewModel, type JudgmentScoreboardResult } from "./judgment-scoreboard.viewmodel";

/** 서버는 집계 쿼리 두 개(그룹 통계 · 그룹별 최근 사례). `/investments` 카드 하나라 미러와 같은 상한 */
const SCOREBOARD_READ_TIMEOUT_MS = 1_500;

type Raw = Record<string, unknown>;

/**
 * 판정 성적표 (F010 슬라이스 3 · `BFF-REQ-039` FR-5). `/investments` 의 카드 하나라 따로 부르고 따로 실패한다.
 * 5xx · 타임아웃 · 계약 깨짐 → 200 `unavailable`. 4xx · 취소는 그대로.
 */
export class AppJudgmentScoreboardService {
  async get(token: string, signal?: AbortSignal): Promise<JudgmentScoreboardResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", "/coach/scoreboard", token, undefined, {
            timeout: SCOREBOARD_READ_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      const data = ((response.data as { data?: Raw })?.data ?? {}) as Raw;
      return toJudgmentScoreboardViewModel(data);
    } catch (error) {
      if (toUpstreamClientError(error) || signal?.aborted) throw error;
      logger.warn("[judgment-scoreboard] unavailable", { reason: (error as Error)?.message });
      return { status: "unavailable" };
    }
  }
}

export const appJudgmentScoreboardService = new AppJudgmentScoreboardService();
