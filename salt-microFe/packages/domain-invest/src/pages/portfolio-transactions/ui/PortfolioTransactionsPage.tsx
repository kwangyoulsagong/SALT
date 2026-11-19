
import { InvestSide, INVEST_SIDE_LABEL } from "@/widgets/judgment-overview";
import { BlockBoundary, PageFrame } from "@repo/web-shared/ui";

import { PORTFOLIO_TRANSACTIONS_PAGE } from "../model";
import { PortfolioTransactionsBody } from "./PortfolioTransactionsBody";

/**
 * 보유 기록 관리(`/portfolio/transactions`) — 서버 컴포넌트. 포지션 아래 "보유 기록 관리 →"가 여기로 온다(FR-109).
 * 머리 메뉴는 "포트폴리오"가 선택된 채다(`/portfolio/` 아래). 본문을 놓는 것까지만 한다(`fsd-pages.md`)
 */
export const PortfolioTransactionsPage = () => (
  <PageFrame title={PORTFOLIO_TRANSACTIONS_PAGE.title} side={<InvestSide />} sideLabel={INVEST_SIDE_LABEL}>
    <BlockBoundary name={PORTFOLIO_TRANSACTIONS_PAGE.blockName} minHeight={PORTFOLIO_TRANSACTIONS_PAGE.blockMinHeight}>
      <PortfolioTransactionsBody />
    </BlockBoundary>
  </PageFrame>
);
