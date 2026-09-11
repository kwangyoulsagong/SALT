import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";

import { ProfileHeader } from "@/entities/auth";
import { BlockBoundary, CrossZoneLink } from "@/shared/ui";

import { HOME_BLOCK_MIN_HEIGHT, HOME_BRIEFING_MESSAGES } from "../model/messages";
import { GoalsBlock } from "./GoalsBlock";
import { InvestmentsBlock } from "./InvestmentsBlock";
import { SavingTipBlock } from "./SavingTipBlock";

/**
 * 홈 브리핑 — 블록 조합과 **부분 실패 격리**를 담당한다 (`fsd-widgets.md`).
 *
 * ## 지금은 스트리밍되지 않는다
 *
 * 블록마다 `BlockBoundary`(Suspense + error boundary)를 뒀지만, **서버에서 기다리는
 * 데이터가 없다.** 목표·투자 블록이 아직 클라이언트에서 React Query 로 조회하기 때문이다
 * (MSW). 그래서 경계는 현재 **부분 실패 격리**만 실제로 하고 있다.
 *
 * 서버 스트리밍이 되는 시점은 F006(`FE-REQ-030`~`033`)에서 5블록 홈을 만들고
 * `BFF-REQ-028` 의 블록별 엔드포인트가 생길 때다. 그때 각 블록이
 * **서버 컴포넌트 + `await fetch`** 로 바뀌고, 경계는 그대로 둔다.
 *
 * 경계 수는 화면당 5개 이하다 (FE-REQ-008 FR-26). 현재 2개.
 */
export const HomeBriefing = () => {
  return (
    <Container size="full" padding="none">
      <FlexBox direction="column" justify="center" gap="lg">
        <ProfileHeader />
        <BlockBoundary
          name={HOME_BRIEFING_MESSAGES.goalsBlockName}
          minHeight={HOME_BLOCK_MIN_HEIGHT.goals}
        >
          <GoalsBlock />
        </BlockBoundary>
        <BlockBoundary
          name={HOME_BRIEFING_MESSAGES.investmentsBlockName}
          minHeight={HOME_BLOCK_MIN_HEIGHT.investments}
        >
          <InvestmentsBlock />
        </BlockBoundary>
        <CrossZoneLink href="/tax">
          {HOME_BRIEFING_MESSAGES.taxCockpitLink}
        </CrossZoneLink>
        <SavingTipBlock />
      </FlexBox>
    </Container>
  );
};

export default HomeBriefing;
