import { BlockBoundary, PageFrame } from "@repo/web-shared/ui";

import { serverGoal } from "../api";
import { GOAL_DETAIL_PAGE as M } from "../model";
import { GoalDetailView } from "./GoalDetailView";

/** 목표 상세 `/goals/[id]` — 서버 셸 + 상세 잎(`FE-REQ-056` → `FE-REQ-060` FR-9 상세 틀). 라우트 파라미터 해석까지만 */
export const GoalDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const initial = await serverGoal(id);
  return (
    <PageFrame surface="cards">
      <BlockBoundary name={M.blockName} minHeight={480}>
        <GoalDetailView goalId={id} initial={initial} />
      </BlockBoundary>
    </PageFrame>
  );
};

export default GoalDetailPage;
