import { Container } from "@repo/ui/container";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { BlockBoundary } from "@repo/web-shared/ui";

import { PORTFOLIO_TRANSACTIONS_PAGE } from "../model";
import { PortfolioTransactionsBody } from "./PortfolioTransactionsBody";

/**
 * 보유 기록 관리(`/portfolio/transactions`) — 서버 컴포넌트. 포지션 아래 "보유 기록 관리 →"가 여기로 온다(FR-109).
 * 머리 메뉴는 "포트폴리오"가 선택된 채다(`/portfolio/` 아래). 본문을 놓는 것까지만 한다(`fsd-pages.md`)
 */
export const PortfolioTransactionsPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <Heading level={1} size="lg">
            {PORTFOLIO_TRANSACTIONS_PAGE.title}
          </Heading>
          <BlockBoundary name={PORTFOLIO_TRANSACTIONS_PAGE.blockName} minHeight={PORTFOLIO_TRANSACTIONS_PAGE.blockMinHeight}>
            <PortfolioTransactionsBody />
          </BlockBoundary>
        </Padding>
      </Container>
    </Section>
  </Root>
);
