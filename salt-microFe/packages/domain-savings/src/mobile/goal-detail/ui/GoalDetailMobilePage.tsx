import { serverBffRead } from "@repo/web-shared/api/server";
import { BlockBoundary } from "@repo/web-shared/ui";
import { MobileScreen } from "@repo/web-shared/layout/mobile";

import type { SavingsGoalDetail } from "@/entities/goal";

import { GOAL_DETAIL_MOBILE as M } from "../model/messages";
import { GoalDetailMobile } from "./GoalDetailMobile";

/** 휴대폰 목표 상세 `/m/goals/[id]`(`FE-REQ-072` FR-2) — 서버 셸. 첫 숫자는 데스크톱 상세와 같은 BFF 하나(`/api/app/savings/goals/:id`) */
export const GoalDetailMobilePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const initial = await serverBffRead<SavingsGoalDetail>(`/api/app/savings/goals/${encodeURIComponent(id)}`);
  return (
    <MobileScreen variant="detail">
      <BlockBoundary name={M.blockName} minHeight={480}>
        <GoalDetailMobile goalId={id} initial={initial} />
      </BlockBoundary>
    </MobileScreen>
  );
};
