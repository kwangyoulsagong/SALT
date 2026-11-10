import { Container } from "@repo/ui/container";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { BlockBoundary } from "@repo/web-shared/ui";

import { PORTFOLIO_PAGE } from "../model";
import { PortfolioBody } from "./PortfolioBody";

/**
 * 포트폴리오(`/portfolio`) — 서버 컴포넌트(`FE-REQ-069` FR-4). 투자 zone 머리 메뉴 "포트폴리오"가 여기로 온다.
 * 참고 증권 웹 둘 다 보유를 시세 · 분석과 떼어 최상위 메뉴로 둔다(리서치 `2026-11-10-invest-header-portfolio.md`). 본문을 놓는 것까지만 한다(`fsd-pages.md`)
 */
export const PortfolioPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <Heading level={1} size="lg">
            {PORTFOLIO_PAGE.title}
          </Heading>
          <BlockBoundary name={PORTFOLIO_PAGE.blockName} minHeight={PORTFOLIO_PAGE.blockMinHeight}>
            <PortfolioBody />
          </BlockBoundary>
        </Padding>
      </Container>
    </Section>
  </Root>
);
