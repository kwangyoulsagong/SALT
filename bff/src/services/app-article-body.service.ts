import { logger } from "../config/logger";
import { toUpstreamClientError } from "../utils/error.util";
import { backendApi } from "./backend-api.service";
import { ArticleBodyContractError, toArticleBodyVM, type ArticleBodyVM } from "./article-body.viewmodel";

/**
 * 첫 조회는 서버가 포털 검색(4s, 못 찾으면 한 번 더 4s) + 기사 페이지(8s)를 차례로 부른다 — 최악 16s 보다 길게.
 * 15s 였을 때 두 번째 검색이 붙은 기사가 잘렸다(서버는 찾았는데 화면은 요약, 2026-11-09 확인 2회차). 두 번째부터는 캐시라 수십 ms.
 * 모달은 요약을 먼저 그리고 본문을 기다린다(`FE-REQ-068`) — 화면 첫 페인트 예산 밖
 */
const BODY_TIMEOUT_MS = 20_000;

/**
 * 기사 본문(`BFF-REQ-053`) — 코인 `/news/:id/body` · 국내 `/market/kr/:code/news/:serial/body` — 둘 다 사람 · 게스트 토큰(`ADR-011`). 서버 판정 그대로 · 캐시 0
 * (서버가 캐시한다). 4xx(401 · 404)는 그대로 올리고, 503(키 없음 · 국내 꺼짐) · 5xx · 시간 초과 · 계약 깨짐은 `unavailable` —
 * 화면은 요약 · 원문 링크로 돌아간다. 다시 시도하지 않는다(서버가 실패를 캐시하고 30분 뒤 다시 찾는다)
 */
class AppArticleBodyService {
  coin(token: string, id: string, signal?: AbortSignal) {
    return this.read(`/news/${encodeURIComponent(id)}/body`, token, signal);
  }

  kr(token: string, code: string, serial: string, signal?: AbortSignal) {
    return this.read(`/market/kr/${encodeURIComponent(code)}/news/${encodeURIComponent(serial)}/body`, token, signal);
  }

  private async read(path: string, token: string, signal?: AbortSignal): Promise<ArticleBodyVM> {
    try {
      const response = await backendApi.proxyAuthRequest("GET", path, token, undefined, { timeout: BODY_TIMEOUT_MS, signal });
      return toArticleBodyVM((response.data as { data?: unknown })?.data);
    } catch (error) {
      if (signal?.aborted) throw error;
      if (toUpstreamClientError(error)) throw error;
      logger.warn("[news] body unavailable", {
        status: (error as { response?: { status?: number } })?.response?.status ?? null,
        reason: error instanceof ArticleBodyContractError ? error.message : (error as Error)?.message,
      });
      return { status: "unavailable" };
    }
  }
}

export const appArticleBodyService = new AppArticleBodyService();
