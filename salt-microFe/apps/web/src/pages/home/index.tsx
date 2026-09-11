import Header from "@/components/Home/Header/Header";
import BlockBoundary from "@/components/Block/BlockBoundary";
import CrossZoneLink from "@/components/Zone/CrossZoneLink";
import GoalsApp from "@/component/GoalsApp/GoalsApp";
import InvestmentsApp from "@/component/InvestmentsApp/InvestmentsApp";
import Tip from "@/components/TipsApp/TipsApp";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";

/**
 * 홈 (`/home`) — 서버 컴포넌트.
 *
 * 목표·투자는 이제 remote 가 아니라 같은 zone 의 로컬 섹션이다 (FE-REQ-007).
 * 세금은 다른 zone 이므로 `CrossZoneLink`(=`<a>`)로 나간다.
 *
 * ## 블록 경계에 대해 — 지금은 스트리밍되지 않는다
 *
 * 블록마다 `BlockBoundary`(Suspense + error boundary)를 뒀지만, **지금 이 화면은
 * 서버에서 기다리는 데이터가 없다.** 목표·투자 블록이 아직 클라이언트에서 React Query 로
 * 조회하기 때문이다(`useGoals`·`useInvestments` → MSW). 그래서 Suspense 가 붙잡을 대상이 없고,
 * 경계는 **부분 실패 격리**만 실제로 하고 있다.
 *
 * 서버 스트리밍이 되는 시점은 F006(`FE-REQ-030`~`033`)에서 5블록 홈을 만들고
 * `BFF-REQ-028`의 블록별 엔드포인트가 생길 때다. 그때 이 파일의 각 블록이
 * **서버 컴포넌트 + `await fetch`** 로 바뀌고, 경계는 그대로 둔다.
 * 측정과 판정은 `FE-REQ-008` FR-30~32 게이트를 그때 다시 돌린다.
 *
 * 경계 수는 화면당 5개 이하다 (FR-26). 현재 2개.
 */
export default function HomePage() {
  return (
    <Container size="full" padding="none">
      <FlexBox direction="column" justify="center" gap="lg">
        <Header />
        <BlockBoundary name="목표" minHeight={320}>
          <GoalsApp />
        </BlockBoundary>
        <BlockBoundary name="투자" minHeight={240}>
          <InvestmentsApp />
        </BlockBoundary>
        <CrossZoneLink href="/tax">세금 마감 콕핏</CrossZoneLink>
        <Tip />
      </FlexBox>
    </Container>
  );
}
