import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import { PORTFOLIO_MESSAGES } from "../model/messages";
import { PortfolioSummary } from "../model/types";

/**
 * 투자 요약 조회. 지금은 MSW 가 받는다 — BFF 이관은 `FE-REQ-012` 다.
 * 조회만 둔다 (`fsd-entities.md`).
 */
export const portfolioApi = {
  investmentsPreview: async () => {
    try {
      const response = await apiFetch("/api/v1/investments/preview");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "이번주 지출 분석 가져오는데 실패했습니다."
        );
      }
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "이번주 지출 분석 가져오는데 오류 발생하였습니다."
      );
    }
  },
  /**
   * 보유 요약 — 홈 "주식" 섹션.
   *
   * 이쪽은 MSW 가 아니라 **BFF** 다. 같은 파일에 두 upstream 이 섞이는 것은 이관
   * 중이기 때문이고, 나머지도 `FE-REQ-012` 에서 BFF 로 옮겨간다.
   */
  summary: async (signal?: AbortSignal): Promise<PortfolioSummary> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}/api/app/portfolio/summary`,
      { headers: authHeader(), signal },
    );
    if (!response.ok) {
      throw new Error(PORTFOLIO_MESSAGES.holdingsLoadFailed);
    }
    return (await response.json()) as PortfolioSummary;
  },
};
