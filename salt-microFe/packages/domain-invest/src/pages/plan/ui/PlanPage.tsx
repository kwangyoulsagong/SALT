
import { InvestSide, INVEST_SIDE_LABEL } from "@/widgets/judgment-overview";
import { BlockBoundary, PageFrame } from "@repo/web-shared/ui";

import { PLAN_PAGE_META } from "../model";
import { PlanBody } from "./PlanBody";

/**
 * 밴드 적립(`/plan`) — 서버 컴포넌트. 투자 zone 머리 메뉴 "적립"이 여기로 온다(F003 v2 순서 3).
 * 본문을 놓는 것까지만 한다(`fsd-pages.md`)
 */
export const PlanPage = () => (
  <PageFrame title={PLAN_PAGE_META.title} side={<InvestSide />} sideLabel={INVEST_SIDE_LABEL}>
    <BlockBoundary name={PLAN_PAGE_META.blockName} minHeight={PLAN_PAGE_META.blockMinHeight}>
      <PlanBody />
    </BlockBoundary>
  </PageFrame>
);
