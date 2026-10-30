import { Container } from "@repo/ui/container";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { AssetSearch } from "@/widgets/asset-search";
import { BlockBoundary } from "@/shared/ui";

import { SEARCH_PAGE } from "../model";

/**
 * 종목 검색 (`/search`) — 서버 컴포넌트 (`FE-REQ-010` FR-70). 본문은 클라이언트 위젯이다 — 사용자별 `isTracked` 를 서버에서
 * 미리 그리지 않는다(`FE-REQ-011` FR-84). `BlockBoundary` 의 Suspense 가 위젯의 `useSearchParams` 경계를 겸한다
 */
export const SearchPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <Heading level={1} size="lg">
            {SEARCH_PAGE.title}
          </Heading>
          <BlockBoundary name={SEARCH_PAGE.blockName} minHeight={SEARCH_PAGE.blockMinHeight}>
            <AssetSearch />
          </BlockBoundary>
        </Padding>
      </Container>
    </Section>
  </Root>
);

export default SearchPage;
