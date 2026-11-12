import { logger } from "../config/logger";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import { toMoveSummaryVM, WhyMovedContractError, type MoveSummaryGateVM, type MoveSummaryVM } from "./why-moved.viewmodel";

/** 저장값 읽기 — ①② 와 같은 예산 안에서 병렬(`BFF-REQ-051` FR-7) */
const MOVE_SUMMARY_TIMEOUT_MS = 800;

/**
 * 오늘 등락 한 줄(③ — F016 단계 D) — 서버 coach `GET /api/ai-coach/move-summary`. **던지지 않는다**:
 * ③이 실패해도 ①② 카드는 선다(`ADR-009` §1 — ①②는 ③ 없이도 말이 된다). 끊긴 요청만 그대로 올린다
 */
class MoveSummaryService {
  async get(
    token: string,
    asset: "kr" | "crypto",
    symbol: string,
    signal?: AbortSignal,
  ): Promise<{ summary: MoveSummaryVM | null; gate: MoveSummaryGateVM }> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest(
            "GET",
            `/ai-coach/move-summary?asset=${asset}&symbol=${encodeURIComponent(symbol)}`,
            token,
            undefined,
            { timeout: MOVE_SUMMARY_TIMEOUT_MS, signal },
          ),
        signal,
      );
      return toMoveSummaryVM((response.data as { data?: unknown })?.data);
    } catch (error) {
      if (signal?.aborted) throw error;
      logger.warn(`[${asset}] move-summary unavailable`, {
        reason: error instanceof WhyMovedContractError ? error.message : (error as Error)?.message,
      });
      return { summary: null, gate: "unavailable" };
    }
  }
}

export const moveSummaryService = new MoveSummaryService();
