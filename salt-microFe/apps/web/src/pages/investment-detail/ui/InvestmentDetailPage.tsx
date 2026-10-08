import { isKrStockCode } from "@repo/core/marketKr";
import { Container } from "@repo/ui/container";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { COACH_MODE_PARAM, ROUTES } from "@/shared/config";
import { BlockBoundary } from "@/shared/ui";
import { backLink } from "@/shared/ui/surface.css";

import { publicMarketApi } from "../api";
import {
  buildDetailBreadcrumb,
  buildDetailMetadata,
  buildKrStockMetadata,
  parseSymbolParam,
} from "../lib";
import {
  INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT,
  INVESTMENT_DETAIL_PAGE_MESSAGES,
} from "../model";
import { detailStack } from "./InvestmentDetail.css";
import { InvestmentDetailBody } from "./InvestmentDetailBody";
import { KrStockDetailBody } from "./KrStockDetailBody";
import { SymbolHeader } from "./SymbolHeader";

interface InvestmentDetailPageProps {
  params: Promise<{ symbol: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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
  // 국내 주식은 공개 시세를 받지 않는다 — 제목에 시세 없음 · 색인 안 함(KRX 재배포 약관, F011 §정책)
  if (isKrStockCode(symbol)) return buildKrStockMetadata(symbol);
  return buildDetailMetadata(symbol, await publicMarketApi.listing(symbol));
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
export const InvestmentDetailPage = async ({
  params,
  searchParams,
}: InvestmentDetailPageProps) => {
  const { symbol: raw } = await params;
  const symbol = parseSymbolParam(raw);
  if (!symbol) notFound();
  if (isKrStockCode(symbol)) return <KrStockDetailPage code={symbol} />;

  const [listing, query] = await Promise.all([
    publicMarketApi.listing(symbol),
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const rawMode = query[COACH_MODE_PARAM];
  const mode = typeof rawMode === "string" ? rawMode : null;

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
              <div className={detailStack}>
                <SymbolHeader symbol={symbol} listing={listing} mode={mode} />
                <InvestmentDetailBody symbol={symbol} />
              </div>
            </BlockBoundary>
          </Padding>
        </Container>
      </Section>
    </Root>
  );
};

/**
 * 국내 주식 상세(F011 `FE-REQ-041` FR-46) — 같은 라우트, 숫자로 시작하는 6자리 코드면 여기로 온다(F011 OQ). 서버는 껍데기만
 * 그린다: 코인처럼 공개 시세로 머리를 서버 렌더하면 비회원 HTML 에 국내 주식 시세가 들어간다. JSON-LD · 코치 본문도 없다.
 */
const KrStockDetailPage = ({ code }: { code: string }) => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <div className={detailStack}>
            <Link href={ROUTES.investments} className={backLink}>
              {`‹ ${INVESTMENT_DETAIL_PAGE_MESSAGES.krBack}`}
            </Link>
            <BlockBoundary
              name={INVESTMENT_DETAIL_PAGE_MESSAGES.krBlockName}
              minHeight={INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT}
            >
              <KrStockDetailBody code={code} />
            </BlockBoundary>
          </div>
        </Padding>
      </Container>
    </Section>
  </Root>
);

export default InvestmentDetailPage;
