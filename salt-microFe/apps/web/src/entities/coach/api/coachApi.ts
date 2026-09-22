import type { SymbolCoachViewModel } from "@repo/core/coach";

import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import { COACH_ENDPOINTS } from "./endpoints";

/** BFF `/api/app/*` 응답 봉투 */
interface AppEnvelope<T> {
  success: boolean;
  data: T;
}

/** 상태 코드를 들고 던진다 — 재시도 판단이 4xx 와 5xx 를 가른다 */
export class CoachApiError extends Error {
  constructor(readonly status: number) {
    super(`coach api ${status}`);
  }
}

/**
 * 조회만 둔다. mutation(해설 · 피드백 · 주문 전 체크)은 `features/{slice}/api` 로 올린다.
 *
 * `axios` 가 아니라 `apiFetch` 다 — 시세 슬라이스의 `axios` 직접 호출은 번들 회귀를 세 번
 * 냈고 `shared/api` 로 올릴 부채다. 새 호출은 처음부터 그 길로 간다.
 */
export const coachApi = {
  /**
   * 종목 판단 (`GET /api/app/ai-coach/detail`). **인증이 필요하다.**
   *
   * `signal` 이 끊기면 BFF 도 서버 요청을 끊는다(`BFF-REQ-026` FR-52). 행을 빠르게
   * 옮기면 React Query 가 이전 쿼리의 signal 을 끊는다 — 그래서 여기서 꼭 넘긴다.
   */
  symbolDetail: async (
    symbol: string,
    signal?: AbortSignal,
  ): Promise<SymbolCoachViewModel> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.symbolDetail(symbol)}`,
      { headers: authHeader(), signal },
    );
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<SymbolCoachViewModel>;
    return body.data;
  },
};
