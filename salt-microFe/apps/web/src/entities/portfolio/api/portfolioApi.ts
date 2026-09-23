import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import { PORTFOLIO_MESSAGES } from "../model/messages";
import { PortfolioSummary } from "../model/types";

/**
 * 보유 요약 조회. 조회만 둔다 (`fsd-entities.md`).
 *
 * 2026-09-23 — 이 파일에 있던 "이번주 지출 분석"(`/api/v1/investments/preview`)을 지웠다. MSW 목만
 * 받던 경로였고 서버 · BFF 어디에도 지출 데이터가 없다 — 목을 걷으면 지어낸 숫자만 남는다.
 */
export const portfolioApi = {
  /** 보유 요약 — 홈 "주식" 섹션. BFF 뷰모델 */
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
