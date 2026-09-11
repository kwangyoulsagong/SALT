import Header from "@/components/Home/Header/Header";
import { SectionBoundary } from "@/components/Section/SectionBoundary";
import CrossZoneLink from "@/components/Zone/CrossZoneLink";
import GoalsApp from "@/component/GoalsApp/GoalsApp";
import InvestmentsApp from "@/component/InvestmentsApp/InvestmentsApp";
import Tip from "@/components/TipsApp/TipsApp";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";

/**
 * 목표·투자는 이제 remote 가 아니라 같은 zone 의 로컬 섹션이다 (FE-REQ-007).
 * 세금은 다른 zone 이므로 `CrossZoneLink`(=`<a>`)로 나간다.
 */
export default function HomePage() {
  return (
    <Container size="full" padding="none">
      <FlexBox direction="column" justify="center" gap="lg">
        <Header />
        <SectionBoundary name="목표">
          <GoalsApp />
        </SectionBoundary>
        <SectionBoundary name="투자">
          <InvestmentsApp />
        </SectionBoundary>
        <CrossZoneLink href="/tax">세금 마감 콕핏</CrossZoneLink>
        <Tip />
      </FlexBox>
    </Container>
  );
}
