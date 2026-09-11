import { Container } from "@repo/ui/container";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { ProfileHeader } from "@/entities/auth";
import { BlockBoundary } from "@/shared/ui";
import { MarketBoard } from "@/widgets/market-board";

import {
  INVESTMENTS_BLOCK_MIN_HEIGHT,
  INVESTMENTS_PAGE_MESSAGES,
} from "../model";

/**
 * 투자 (`/investments`) — 서버 컴포넌트.
 *
 * `MarketBoard` 는 탭 상태와 실시간 테이블을 갖는 클라이언트 잎이고, 그 안에서
 * `next/dynamic` + `ssr:false` 로 테이블을 내린다 (FE-REQ-008 FR-13).
 *
 * **`ssr:false` 를 이 파일에서 부르지 않는 이유:** App Router 의 서버 컴포넌트에서는
 * `next/dynamic` 의 `ssr:false` 가 허용되지 않는다. 클라이언트 잎 안쪽으로 옮겼다.
 *
 * FR-4 의 `/assets` 리다이렉트는 여기서 하지 않는다 — `/assets` 가 아직 없다.
 * 3탭 IA 와 함께 F006(`FE-REQ-030`)에서 붙인다.
 */
export const InvestmentsPage = () => {
  return (
    <Root background="white">
      <Section containerSize="full" padding="sm">
        <Container size="2xl" padding="none">
          <ProfileHeader />
          <Padding paddingX="xl">
            <BlockBoundary
              name={INVESTMENTS_PAGE_MESSAGES.blockName}
              minHeight={INVESTMENTS_BLOCK_MIN_HEIGHT}
            >
              <MarketBoard />
            </BlockBoundary>
          </Padding>
        </Container>
      </Section>
    </Root>
  );
};

export default InvestmentsPage;
