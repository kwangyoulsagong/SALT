
import { InvestSide, INVEST_SIDE_LABEL } from "@/widgets/judgment-overview";
import { BlockBoundary, PageFrame } from "@repo/web-shared/ui";

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
  <PageFrame side={<InvestSide />} sideLabel={INVEST_SIDE_LABEL}>
    <BlockBoundary
      name={COACH_REPORT_PAGE.blockName}
      minHeight={COACH_REPORT_PAGE.blockMinHeight}
    >
      <CoachReportBody />
    </BlockBoundary>
  </PageFrame>
);

export default CoachReportPage;
