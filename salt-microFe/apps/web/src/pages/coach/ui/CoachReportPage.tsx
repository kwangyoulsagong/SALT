import { Container } from "@repo/ui/container";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { BlockBoundary } from "@/shared/ui";

import { COACH_REPORT_PAGE } from "../model";
import { CoachReportBody } from "./CoachReportBody";

/**
 * 코치 리포트 (`/coach/report`) — 서버 컴포넌트 (`FE-REQ-026` FR-140).
 *
 * 코치 탭(`/coach`, F006 대화)의 push 화면이다. 탭이 아직 없어 투자 화면 머리에서 들어온다.
 * 본문을 놓는 것까지만 한다(`fsd-pages.md`). 배경은 앱 껍데기의 회색 — 흰 패널이 그 위에 선다.
 * 프로필 블록을 두지 않는다: 읽을 내용이 첫 화면에서 한 칸 밀려 내려간다.
 */
export const CoachReportPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <BlockBoundary
            name={COACH_REPORT_PAGE.blockName}
            minHeight={COACH_REPORT_PAGE.blockMinHeight}
          >
            <CoachReportBody />
          </BlockBoundary>
        </Padding>
      </Container>
    </Section>
  </Root>
);

export default CoachReportPage;
