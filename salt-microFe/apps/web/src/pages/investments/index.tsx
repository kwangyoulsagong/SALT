import BlockBoundary from "@/components/Block/BlockBoundary";
import Header from "@/components/Home/Header/Header";
import Investment from "@/component/Investment/Investment";
import { Section } from "@repo/ui/section";
import { Padding } from "@repo/ui/padding";
import { Container } from "@repo/ui/container";
import { Root } from "@repo/ui/root";

/**
 * 투자 (`/investments`) — 서버 컴포넌트.
 *
 * `Investment` 는 탭 상태와 실시간 테이블을 갖는 클라이언트 잎이고, 그 안에서
 * `next/dynamic` + `ssr:false` 로 차트를 내린다 (FR-13).
 *
 * **`ssr:false` 를 이 파일에서 부르지 않는 이유:** App Router 의 서버 컴포넌트에서는
 * `next/dynamic` 의 `ssr:false` 가 허용되지 않는다. 클라이언트 잎 안쪽으로 옮겼다.
 *
 * FR-4 의 `/assets` 리다이렉트는 여기서 하지 않는다 — `/assets` 가 아직 없다.
 * 3탭 IA 와 함께 F006(`FE-REQ-030`)에서 붙인다.
 */
const Investments = () => {
  return (
    <Root background="white">
      <Section containerSize="full" padding="sm">
        <Container size="2xl" padding="none">
          <Header />
          <Padding paddingX="xl">
            <BlockBoundary name="투자 분석" minHeight={420}>
              <Investment />
            </BlockBoundary>
          </Padding>
        </Container>
      </Section>
    </Root>
  );
};

export default Investments;
