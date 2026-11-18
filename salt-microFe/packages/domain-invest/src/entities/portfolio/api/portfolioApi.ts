import { apiFetch } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

import { PORTFOLIO_MESSAGES } from "../model/messages";
import type { FlowRange, PositionFlowVM, PositionOverviewVM, PositionTransactionPageVM } from "../model/position";
import { POSITION_MESSAGES, TRANSACTION_LIST_MESSAGES } from "../model/position";
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
      { signal },
    );
    if (!response.ok) {
      throw new Error(PORTFOLIO_MESSAGES.holdingsLoadFailed);
    }
    return (await response.json()) as PortfolioSummary;
  },

  /** 포지션 개요 — Hero · 리스크 레이더(F006 G절). BFF 뷰모델 */
  position: async (signal?: AbortSignal): Promise<PositionOverviewVM> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/portfolio/position`, { signal });
    if (!response.ok) throw new Error(POSITION_MESSAGES.loadFailed);
    return (await response.json()) as PositionOverviewVM;
  },
  /** 평가금 흐름 — 기간 버튼은 이것만 다시 부른다(FE FR-91) */
  positionFlow: async (range: FlowRange, signal?: AbortSignal): Promise<PositionFlowVM> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/portfolio/position/flow?range=${range}`, { signal });
    if (!response.ok) throw new Error(POSITION_MESSAGES.flowLoadFailed);
    return (await response.json()) as PositionFlowVM;
  },
  /** 거래 목록 한 쪽 — 최신순(F006 G절 2단계). 쓰기는 `features/record-transaction` */
  transactions: async (page: number, signal?: AbortSignal): Promise<PositionTransactionPageVM> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}/api/app/portfolio/transactions?page=${page}`, { signal });
    if (!response.ok) throw new Error(TRANSACTION_LIST_MESSAGES.loadFailed);
    return ((await response.json()) as { data: PositionTransactionPageVM }).data;
  },
};
