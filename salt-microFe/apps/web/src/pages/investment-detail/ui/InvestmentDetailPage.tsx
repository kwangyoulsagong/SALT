import { Container } from "@repo/ui/container";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";
import { notFound } from "next/navigation";

import { BlockBoundary } from "@/shared/ui";

import { parseSymbolParam } from "../lib";
import {
  INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT,
  INVESTMENT_DETAIL_PAGE_MESSAGES,
} from "../model";
import { InvestmentDetailBody } from "./InvestmentDetailBody";

interface InvestmentDetailPageProps {
  params: Promise<{ symbol: string }>;
}

/**
 * 상세 분석 (`/investments/[symbol]`) — 서버 컴포넌트 (`FE-REQ-026` FR-130).
 *
 * 자산 탭 안의 push 화면이다(D7) — 하단 탭을 바꾸지 않는다. 라우트 파라미터를 해석하고
 * 본문을 놓는 것까지만 한다(`fsd-pages.md`). 모양이 아닌 심볼은 404 다.
 */
export const InvestmentDetailPage = async ({ params }: InvestmentDetailPageProps) => {
  const { symbol: raw } = await params;
  const symbol = parseSymbolParam(raw);
  if (!symbol) notFound();

  return (
    <Root background="transparent">
      <Section containerSize="full" padding="sm">
        <Container size="2xl" padding="none">
          <Padding paddingX="xl">
            <BlockBoundary
              name={INVESTMENT_DETAIL_PAGE_MESSAGES.blockName}
              minHeight={INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT}
            >
              <InvestmentDetailBody symbol={symbol} />
            </BlockBoundary>
          </Padding>
        </Container>
      </Section>
    </Root>
  );
};

export default InvestmentDetailPage;
