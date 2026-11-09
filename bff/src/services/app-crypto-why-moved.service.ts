import { logger } from "../config/logger";
import { toUpstreamClientError } from "../utils/error.util";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import { toWhyMovedVM, WhyMovedContractError, type WhyMovedVM } from "./why-moved.viewmodel";

/** 저장값 읽기 — 국내 상세와 같은 예산(`performance-bff.md` · `BFF-REQ-051` FR-7) */
const WHY_MOVED_TIMEOUT_MS = 800;

export type CryptoWhyMovedResult = ({ status: "ok" } & WhyMovedVM) | { status: "unavailable" };

/**
 * 코인 "왜 움직였나"(F016 단계 C · `BFF-REQ-051` FR-1) — 서버 `/investment/crypto/:symbol/why-moved`(로그인 사용자) ↔
 * BFF `/api/app/market/:symbol/why-moved`. 국내와 같은 규칙: 4xx(401 · 404 모르는 종목)는 그대로 올리고, 시간 초과 · 5xx · 계약 깨짐은
 * `unavailable`(화면이 카드를 숨긴다). 캐시 없음 — 서버 저장값 읽기다
 */
class AppCryptoWhyMovedService {
  async get(token: string, symbol: string, signal?: AbortSignal): Promise<CryptoWhyMovedResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", `/investment/crypto/${encodeURIComponent(symbol)}/why-moved`, token, undefined, {
            timeout: WHY_MOVED_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      return { status: "ok", ...toWhyMovedVM((response.data as { data?: unknown })?.data) };
    } catch (error) {
      if (toUpstreamClientError(error) || signal?.aborted) throw error;
      logger.warn("[crypto] why-moved unavailable", {
        reason: error instanceof WhyMovedContractError ? error.message : (error as Error)?.message,
      });
      return { status: "unavailable" };
    }
  }
}

export const appCryptoWhyMovedService = new AppCryptoWhyMovedService();
