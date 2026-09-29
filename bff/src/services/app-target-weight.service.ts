import { toUpstreamClientError } from "../utils/error.util";
import { logger } from "../config/logger";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import { toTargetWeightViewModel, type TargetWeightResult } from "./target-weight.viewmodel";

/** 서버는 리스크 게이지와 같은 재료 + 변동성 · 시세 한 번씩. 게이지(`/risk-budget`)와 같은 상한 */
const TARGET_WEIGHT_READ_TIMEOUT_MS = 1_500;

type Raw = Record<string, unknown>;

/**
 * 목표 비중 안내 (F010 슬라이스 5 · `BFF-REQ-041`). `/investments` [오늘의 판정] 카드 하나라 따로 부르고 따로 실패한다.
 * 5xx · 타임아웃 · 계약 깨짐 → 200 `unavailable`. 4xx · 취소는 그대로.
 */
export class AppTargetWeightService {
  async get(token: string, signal?: AbortSignal): Promise<TargetWeightResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", "/coach/target-weights", token, undefined, {
            timeout: TARGET_WEIGHT_READ_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      const data = ((response.data as { data?: Raw })?.data ?? {}) as Raw;
      return toTargetWeightViewModel(data);
    } catch (error) {
      if (toUpstreamClientError(error) || signal?.aborted) throw error;
      logger.warn("[target-weight] unavailable", { reason: (error as Error)?.message });
      return { status: "unavailable" };
    }
  }
}

export const appTargetWeightService = new AppTargetWeightService();
