import { Container } from "@repo/ui/container";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { marketServerApi } from "@/entities/market";
import { BlockBoundary } from "@/shared/ui";

import { buildDetailBreadcrumb, buildDetailMetadata, parseSymbolParam } from "../lib";
import {
  INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT,
  INVESTMENT_DETAIL_PAGE_MESSAGES,
} from "../model";
import { InvestmentDetailBody } from "./InvestmentDetailBody";

interface InvestmentDetailPageProps {
  params: Promise<{ symbol: string }>;
}

/**
 * 종목 제목 · 설명 · canonical (SEO). 시세는 공개라 토큰 없이 서버에서 받는다 — 같은 요청을
 * 페이지 본문도 하므로 Next 가 한 번으로 묶는다(fetch 메모이제이션).
 */
export const generateMetadata = async ({
  params,
}: InvestmentDetailPageProps): Promise<Metadata> => {
  const { symbol: raw } = await params;
  const symbol = parseSymbolParam(raw);
  if (!symbol) return {};
  return buildDetailMetadata(symbol, await marketServerApi.listing(symbol));
};

/**
 * 상세 분석 (`/investments/[symbol]`) — 서버 컴포넌트 (`FE-REQ-026` FR-130).
 *
 * 자산 탭 안의 push 화면이다(D7) — 하단 탭을 바꾸지 않는다. 라우트 파라미터를 해석하고
 * 본문을 놓는 것까지만 한다(`fsd-pages.md`). 모양이 아닌 심볼은 404 다.
 *
 * 공개 시세를 서버에서 한 번 받아 머리의 첫 렌더 값으로 준다 — 크롤러가 받는 HTML 에 종목
 * 이름 · 가격이 있다. 이동 경로 구조화 데이터(JSON-LD)도 여기서 싣는다.
 */
export const InvestmentDetailPage = async ({ params }: InvestmentDetailPageProps) => {
  const { symbol: raw } = await params;
  const symbol = parseSymbolParam(raw);
  if (!symbol) notFound();

  const listing = await marketServerApi.listing(symbol);

  return (
    <Root background="transparent">
      <script
        type="application/ld+json"
        // 종목 이름은 서버 문자열이다 — `<` 를 이스케이프해 `</script>` 로 빠져나갈 길을 막는다
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildDetailBreadcrumb(symbol, listing)).replace(/</g, "\\u003c"),
        }}
      />
      <Section containerSize="full" padding="sm">
        <Container size="2xl" padding="none">
          <Padding paddingX="xl">
            <BlockBoundary
              name={INVESTMENT_DETAIL_PAGE_MESSAGES.blockName}
              minHeight={INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT}
            >
              <InvestmentDetailBody symbol={symbol} initialListing={listing} />
            </BlockBoundary>
          </Padding>
        </Container>
      </Section>
    </Root>
  );
};

export default InvestmentDetailPage;
